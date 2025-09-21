import type { ResourceDiagnosticLevel } from './services/resource-diagnostic.service'
import type { RawfileDiagnosticLevel } from './services/rawfile-diagnostic.service'
import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs'
import { ETSLanguagePlugin } from '@arkts/language-plugin'
import { createConnection, createServer, createTypeScriptProject } from '@volar/language-server/node'
import * as ets from 'ohos-typescript'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { URI } from 'vscode-uri'
import { LanguageServerConfigManager } from './classes/config-manager'
import { ResourceWatcher } from './classes/resource-watcher'
import { logger } from './logger'
import { createETS$$ThisService } from './services/$$this.service'
import { createETSLinterDiagnosticService } from './services/diagnostic.service'
import { createETSFormattingService } from './services/formatting.service'
import { createETSResourceCompletionService } from './services/resource-completion.service'
import { createETSRawfileCompletionService } from './services/rawfile-completion.service'
import { createETSIntegratedResourceDefinitionService } from './services/resource-definition.service'
import { createETSIntegratedRawfileDefinitionService } from './services/rawfile-definition.service'
import { createETSResourceDiagnosticService } from './services/resource-diagnostic.service'
import { createETSRawfileDiagnosticService } from './services/rawfile-diagnostic.service'
import { createETSDocumentSymbolService } from './services/symbol.service'

const connection = createConnection()
const server = createServer(connection)
const lspConfiguration = new LanguageServerConfigManager(logger)

logger.getConsola().info(`ETS Language Server is running: (pid: ${process.pid})`)

/**
 * 项目重新检测结果接口
 */
interface ProjectRedetectionResult {
  needed: boolean
  reason?: string
  newProjectRoot?: string
}

/**
 * 检查是否需要重新检测项目类型
 * @param documentPath 当前打开的文档路径
 * @param currentProjectRoot 当前项目根目录
 * @param lspConfig LSP配置管理器
 * @returns 是否需要重新检测以及相关信息
 */
function checkIfProjectRedetectionNeeded(
  documentPath: string,
  currentProjectRoot: string | undefined,
  lspConfig: LanguageServerConfigManager,
): ProjectRedetectionResult {
  try {
    // 1. 如果是第一次打开文档，需要检测
    if (!currentProjectRoot) {
      return {
        needed: true,
        reason: '首次文档打开，需要检测项目类型',
        newProjectRoot: extractProjectRootFromDocument(documentPath),
      }
    }
    
    // 2. 检查文档是否在当前项目根目录范围内
    const normalizedDocPath = path.normalize(documentPath)
    const normalizedCurrentRoot = path.normalize(currentProjectRoot)
    
    if (!normalizedDocPath.startsWith(normalizedCurrentRoot)) {
      // 文档在当前项目根目录之外，寻找新的项目根目录
      const newProjectRoot = extractProjectRootFromDocument(documentPath)
      if (newProjectRoot && newProjectRoot !== currentProjectRoot) {
        return {
          needed: true,
          reason: '文档位于当前项目范围外，检测到新项目根目录',
          newProjectRoot,
        }
      }
    }
    
    // 3. 检查是否是不同类型的项目（例如：从npm项目切换到ohpm项目）
    const detectedProjectRoot = extractProjectRootFromDocument(documentPath)
    if (detectedProjectRoot && detectedProjectRoot !== currentProjectRoot) {
      const tempDetection = lspConfig.detectAndSetProjectType(detectedProjectRoot)
      const currentDetection = lspConfig.getCurrentProjectDetection()
      
      if (currentDetection && 
          (tempDetection.packageManagerType !== currentDetection.packageManagerType || 
           tempDetection.type !== currentDetection.type)) {
        return {
          needed: true,
          reason: `检测到不同类型的项目 (${tempDetection.type}/${tempDetection.packageManagerType} vs ${currentDetection.type}/${currentDetection.packageManagerType})`,
          newProjectRoot: detectedProjectRoot,
        }
      }
    }
    
    return { needed: false }
  } catch (error) {
    logger.getConsola().warn('检查项目重新检测时发生错误:', error)
    return { needed: false }
  }
}

/**
 * 从文档路径提取项目根目录
 * @param documentPath 文档路径
 * @returns 项目根目录路径，如果未找到则返回undefined
 */
function extractProjectRootFromDocument(documentPath: string): string | undefined {
  try {
    let currentDir = path.dirname(documentPath)
    const maxLevels = 10 // 最多向上查找10级目录，避免无限循环
    
    for (let i = 0; i < maxLevels; i++) {
      // 检查ArkTS项目标识文件
      const ohPackageJson = path.join(currentDir, 'oh-package.json5')
      const packageJson = path.join(currentDir, 'package.json')
      
      if (fs.existsSync(ohPackageJson)) {
        logger.getConsola().debug(`找到ArkTS项目根目录: ${currentDir} (oh-package.json5)`)
        return currentDir
      }
      
      if (fs.existsSync(packageJson)) {
        logger.getConsola().debug(`找到Node.js项目根目录: ${currentDir} (package.json)`)
        return currentDir
      }
      
      // 向上一级目录继续查找
      const parentDir = path.dirname(currentDir)
      if (parentDir === currentDir) {
        // 已到达根目录，停止查找
        break
      }
      currentDir = parentDir
    }
    
    logger.getConsola().debug(`未找到项目根目录，文档路径: ${documentPath}`)
    return undefined
  } catch (error) {
    logger.getConsola().warn('提取项目根目录时发生错误:', error)
    return undefined
  }
}

connection.onRequest('ets/waitForEtsConfigurationChangedRequested', (e) => {
  logger.getConsola().info(`waitForEtsConfigurationChangedRequested: ${JSON.stringify(e)}`)
  lspConfiguration.setConfiguration(e)
})

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

// TODO: 监听文件变更
// connection.onDidChangeWatchedFiles((params) => {
//   logger.getConsola().info('Watched files changed:', JSON.stringify(params))
// })

// 文档打开事件监听 - 用于动态项目识别
let currentProjectRoot: string | undefined
connection.onDidOpenTextDocument((params) => {
  try {
    const documentUri = params.textDocument.uri
    const documentPath = URI.parse(documentUri).fsPath
    logger.getConsola().debug('Document opened:', documentPath)
    
    // 检查是否需要重新检测项目类型
    const shouldRedetect = checkIfProjectRedetectionNeeded(documentPath, currentProjectRoot, lspConfiguration)
    if (shouldRedetect.needed) {
      logger.getConsola().info('触发项目重新检测，原因:', shouldRedetect.reason)
      const newProjectRoot = shouldRedetect.newProjectRoot || extractProjectRootFromDocument(documentPath)
      
      if (newProjectRoot && newProjectRoot !== currentProjectRoot) {
        logger.getConsola().info('检测到新的项目根目录:', newProjectRoot)
        currentProjectRoot = newProjectRoot
        
        // 重新检测项目类型
        try {
          const newProjectDetection = lspConfiguration.detectAndSetProjectType(newProjectRoot)
          logger.getConsola().info('文档打开时项目重新检测完成:', {
            type: newProjectDetection.type,
            packageManagerType: newProjectDetection.packageManagerType,
            hasOhModules: newProjectDetection.hasOhModules,
            hasNodeModules: newProjectDetection.hasNodeModules,
            previousRoot: currentProjectRoot,
            newRoot: newProjectRoot,
          })
        } catch (error) {
          logger.getConsola().error('文档打开时项目重新检测失败:', error)
        }
      }
    }
  } catch (error) {
    logger.getConsola().error('处理文档打开事件时发生错误:', error)
  }
})

ResourceWatcher.from(connection)

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
  } catch (error) {
    logger.getConsola().error('项目类型检测失败，继续使用默认配置:', error)
  }

  return server.initialize(
    params,
    createTypeScriptProject(ets as any, tsdk.diagnosticMessages, () => {
      return {
        languagePlugins: [ETSLanguagePlugin(ets, { sdkPaths: [lspConfiguration.getSdkPath(), lspConfiguration.getHmsSdkPath()].filter(Boolean) as string[], tsdk: lspConfiguration.getTsdkPath() })],
        setup(options) {
          if (!options.project || !options.project.typescript || !options.project.typescript.languageServiceHost)
            return

          const originalSettings = options.project.typescript.languageServiceHost.getCompilationSettings() || {}
          logger.getConsola().debug(`Settings: ${JSON.stringify(lspConfiguration.getTsConfig(originalSettings as ets.CompilerOptions), null, 2)}`)
          options.project.typescript.languageServiceHost.getCompilationSettings = () => {
            return lspConfiguration.getTsConfig(originalSettings as ets.CompilerOptions) as any
          }
        },
      }
    }),
    [
      ...createTypeScriptServices(ets as any),
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
