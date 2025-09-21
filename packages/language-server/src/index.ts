import type { RawfileDiagnosticLevel } from './services/rawfile-diagnostic.service'
import type { ResourceDiagnosticLevel } from './services/resource-diagnostic.service'
import process from 'node:process'
import { ETSLanguagePlugin } from '@arkts/language-plugin'
import { createConnection, createServer, createTypeScriptProject } from '@volar/language-server/node'
import * as ets from 'ohos-typescript'
import { URI } from 'vscode-uri'
import { LanguageServerConfigManager } from './classes/config-manager'
import { logger } from './logger'
import { createETS$$ThisService } from './services/$$this.service'
import { createETSLinterDiagnosticService } from './services/diagnostic.service'
import { createETSFormattingService } from './services/formatting.service'
import { ProjectDetectionService } from './services/project-detection.service'
import { createETSRawfileCompletionService } from './services/rawfile-completion.service'
import { createETSIntegratedRawfileDefinitionService } from './services/rawfile-definition.service'
import { createETSRawfileDiagnosticService } from './services/rawfile-diagnostic.service'
import { createETSResourceCompletionService } from './services/resource-completion.service'
import { createETSIntegratedResourceDefinitionService } from './services/resource-definition.service'
import { createETSResourceDiagnosticService } from './services/resource-diagnostic.service'

import { createETSDocumentSymbolService } from './services/symbol.service'
import { TypeScriptServiceWrapper } from './services/typescript-service-wrapper'
import { GlobalErrorHandler } from './utils/error-handler'
// 导入重构后的工具类和服务
import { SafeJson5Parser } from './utils/json5-parser'
import { UriHelper } from './utils/uri-helper'

// 初始化安全的JSON5解析器、全局错误处理器
SafeJson5Parser.initialize(logger)
GlobalErrorHandler.initialize(logger)

const connection = createConnection()
const server = createServer(connection)
const lspConfiguration = new LanguageServerConfigManager(logger)

// 初始化项目检测服务
const projectDetectionService = new ProjectDetectionService(logger, lspConfiguration)

// 全局配置状态
let globalResourceDiagnosticLevel: ResourceDiagnosticLevel = 'error'
let globalRawfileDiagnosticLevel: RawfileDiagnosticLevel = 'error'

// 监听配置变更
connection.onDidChangeConfiguration((params) => {
  const settings = params.settings
  if (settings?.ets?.resourceReferenceDiagnostic) {
    globalResourceDiagnosticLevel = settings.ets.resourceReferenceDiagnostic as ResourceDiagnosticLevel
    logger.getConsola().info('Resource diagnostic level changed to:', globalResourceDiagnosticLevel)
  }
  if (settings?.ets?.rawfileReferenceDiagnostic) {
    globalRawfileDiagnosticLevel = settings.ets.rawfileReferenceDiagnostic as RawfileDiagnosticLevel
    logger.getConsola().info('Rawfile diagnostic level changed to:', globalRawfileDiagnosticLevel)
  }
})

connection.onRequest('ets/waitForEtsConfigurationChangedRequested', (e) => {
  logger.getConsola().info(`waitForEtsConfigurationChangedRequested: ${JSON.stringify(e)}`)
  lspConfiguration.setConfiguration(e)
})

logger.getConsola().info(`ETS Language Server is running: (pid: ${process.pid})`)

// 文档打开事件监听 - 用于动态项目识别
let currentProjectRoot: string | undefined
connection.onDidOpenTextDocument((params) => {
  try {
    const documentUri = params.textDocument.uri
    const documentPath = UriHelper.safeParseUri(documentUri, logger)

    // 如果URI解析失败，直接返回
    if (!documentPath) {
      logger.getConsola().debug('Skipping document with invalid URI:', documentUri)
      return
    }

    logger.getConsola().debug('Document opened:', documentPath)

    // 过滤掉oh_modules和node_modules中的文件，避免不必要的检测
    if (UriHelper.isDependencyFile(documentPath)) {
      logger.getConsola().debug('Skipping project detection for dependency file:', documentPath)
      return
    }

    // 过滤配置文件，避免JSON5解析错误影响项目检测
    if (UriHelper.isConfigFile(documentPath)) {
      logger.getConsola().debug('Skipping project detection for config file:', documentPath)
      return
    }

    // 检查是否需要重新检测项目类型
    const shouldRedetect = projectDetectionService.checkIfProjectRedetectionNeeded(documentPath, currentProjectRoot)
    if (shouldRedetect.needed) {
      logger.getConsola().info('触发项目重新检测，原因:', shouldRedetect.reason)
      const newProjectRoot = shouldRedetect.newProjectRoot || projectDetectionService.extractProjectRootFromDocument(documentPath)

      if (newProjectRoot && newProjectRoot !== currentProjectRoot) {
        logger.getConsola().info('检测到新的项目根目录:', newProjectRoot)
        currentProjectRoot = newProjectRoot

        // 重新检测项目类型
        try {
          projectDetectionService.performProjectRedetection(newProjectRoot, currentProjectRoot)
        }
        catch (error) {
          logger.getConsola().error('文档打开时项目重新检测失败:', error)
        }
      }
    }
  }
  catch (error) {
    logger.getConsola().error('处理文档打开事件时发生错误:', error)
    // 确保错误不会影响其他功能
  }
})

// ResourceWatcher.from(connection) - 暂时注释掉，需要检查导入

// 初始化时记录项目根目录
connection.onInitialize(async (params) => {
  if (params.locale)
    lspConfiguration.setLocale(params.locale)
  lspConfiguration.setConfiguration({ typescript: params.initializationOptions?.typescript })

  // 初始化配置
  if (params.initializationOptions?.ets?.resourceReferenceDiagnostic) {
    globalResourceDiagnosticLevel = params.initializationOptions.ets.resourceReferenceDiagnostic as ResourceDiagnosticLevel
    logger.getConsola().info('Initial resource diagnostic level:', globalResourceDiagnosticLevel)
  }
  if (params.initializationOptions?.ets?.rawfileReferenceDiagnostic) {
    globalRawfileDiagnosticLevel = params.initializationOptions.ets.rawfileReferenceDiagnostic as RawfileDiagnosticLevel
    logger.getConsola().info('Initial rawfile diagnostic level:', globalRawfileDiagnosticLevel)
  }

  const tsdk = lspConfiguration.getTypeScriptTsdk()

  // 获取项目根目录和 SDK 路径
  const projectRoot = params.workspaceFolders?.[0]?.uri
    ? URI.parse(params.workspaceFolders[0].uri).fsPath
    : process.cwd()
  const sdkPath = lspConfiguration.getSdkPath()
  logger.getConsola().info('Server initialization - Project root:', projectRoot)
  logger.getConsola().info('Server initialization - SDK path:', sdkPath)
  logger.getConsola().info('Server initialization - Workspace folders:', params.workspaceFolders)

  // 初始化当前项目根目录
  currentProjectRoot = projectRoot

  // 检测项目类型并自动配置包管理器类型
  try {
    const projectDetection = lspConfiguration.detectAndSetProjectType(projectRoot)
    logger.getConsola().info('项目类型检测完成:', {
      type: projectDetection.type,
      packageManagerType: projectDetection.packageManagerType,
      hasOhModules: projectDetection.hasOhModules,
      hasNodeModules: projectDetection.hasNodeModules,
    })
  }
  catch (error) {
    logger.getConsola().error('项目类型检测失败，继续使用默认配置:', error)
    // 确保即使检测失败也能继续服务
  }

  return server.initialize(
    params,
    createTypeScriptProject(ets as any, tsdk.diagnosticMessages, () => {
      return {
        languagePlugins: [ETSLanguagePlugin(ets, {
          sdkPaths: [lspConfiguration.getSdkPath(), lspConfiguration.getHmsSdkPath()].filter(Boolean) as string[],
          tsdk: lspConfiguration.getTsdkPath(),
        })],
        setup(options) {
          if (!options.project || !options.project.typescript || !options.project.typescript.languageServiceHost)
            return

          const originalSettings = options.project.typescript.languageServiceHost.getCompilationSettings() || {}
          logger.getConsola().debug(`Settings: ${JSON.stringify(lspConfiguration.getTsConfig(originalSettings as ets.CompilerOptions), null, 2)}`)

          // 包装getCompilationSettings方法，添加错误处理
          const originalGetCompilationSettings = options.project.typescript.languageServiceHost.getCompilationSettings
          options.project.typescript.languageServiceHost.getCompilationSettings = () => {
            try {
              return lspConfiguration.getTsConfig(originalSettings as ets.CompilerOptions) as any
            }
            catch (error) {
              logger.getConsola().error('Error in getCompilationSettings:', error)
              return originalSettings as any
            }
          }

          // 包装TypeScript语言服务主机的关键方法
          TypeScriptServiceWrapper.wrapLanguageServiceHost(options.project.typescript.languageServiceHost, logger)
        },
      }
    }),
    [
      ...TypeScriptServiceWrapper.createSafeTypeScriptServices(ets as any, logger),
      createETSIntegratedResourceDefinitionService(projectRoot, lspConfiguration),
      createETSIntegratedRawfileDefinitionService(projectRoot, lspConfiguration),
      createETSResourceCompletionService(projectRoot, lspConfiguration),
      createETSRawfileCompletionService(projectRoot, lspConfiguration),
      createETSResourceDiagnosticService(lspConfiguration, projectRoot, () => globalResourceDiagnosticLevel),
      createETSRawfileDiagnosticService(lspConfiguration, projectRoot, () => globalRawfileDiagnosticLevel),
      createETSLinterDiagnosticService(ets, logger),
      createETSDocumentSymbolService(),
      createETS$$ThisService(lspConfiguration.getLocale()),
      createETSFormattingService(),
    ],
  )
})

connection.listen()
connection.onInitialized(server.initialized)
connection.onShutdown(server.shutdown)

// 调试日志：LSP 服务已启动
logger.getConsola().info('ETS Language Server fully initialized with resource definition support')
