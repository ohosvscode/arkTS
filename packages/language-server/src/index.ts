import type { ResourceDiagnosticLevel } from './services/resource-diagnostic.service'
import process from 'node:process'
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
import { createETSIntegratedResourceDefinitionService } from './services/resource-definition.service'
import { createETSIntegratedRawfileDefinitionService } from './services/rawfile-definition.service'
import { createETSResourceDiagnosticService } from './services/resource-diagnostic.service'
import { createETSDocumentSymbolService } from './services/symbol.service'

const connection = createConnection()
const server = createServer(connection)
const lspConfiguration = new LanguageServerConfigManager(logger)

logger.getConsola().info(`ETS Language Server is running: (pid: ${process.pid})`)

connection.onRequest('ets/waitForEtsConfigurationChangedRequested', (e) => {
  logger.getConsola().info(`waitForEtsConfigurationChangedRequested: ${JSON.stringify(e)}`)
  lspConfiguration.setConfiguration(e)
})

// 全局配置状态
let globalResourceDiagnosticLevel: ResourceDiagnosticLevel = 'error'

// 监听配置变更
connection.onDidChangeConfiguration((params) => {
  const settings = params.settings
  if (settings?.ets?.resourceReferenceDiagnostic) {
    globalResourceDiagnosticLevel = settings.ets.resourceReferenceDiagnostic as ResourceDiagnosticLevel
    logger.getConsola().info('Resource diagnostic level changed to:', globalResourceDiagnosticLevel)
  }
})

// TODO: 监听文件变更
// connection.onDidChangeWatchedFiles((params) => {
//   logger.getConsola().info('Watched files changed:', JSON.stringify(params))
// })

ResourceWatcher.from(connection)

connection.onInitialize(async (params) => {
  if (params.locale)
    lspConfiguration.setLocale(params.locale)
  lspConfiguration.setConfiguration({ typescript: params.initializationOptions?.typescript })

  // 初始化配置
  if (params.initializationOptions?.ets?.resourceReferenceDiagnostic) {
    globalResourceDiagnosticLevel = params.initializationOptions.ets.resourceReferenceDiagnostic as ResourceDiagnosticLevel
    logger.getConsola().info('Initial resource diagnostic level:', globalResourceDiagnosticLevel)
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
      createETSResourceDiagnosticService(lspConfiguration, projectRoot, () => globalResourceDiagnosticLevel),
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
