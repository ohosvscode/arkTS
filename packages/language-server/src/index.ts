/* eslint-disable import/first */
import { createRequire } from 'node:module'

// Polyfill require for ESM compatibility with ohos-typescript
const require = createRequire(import.meta.url)
globalThis.require = require

import process from 'node:process'
import { ETSLanguagePlugin } from '@arkts/language-plugin'
import { createArkTServices, ProjectDetectorManager } from '@arkts/language-service'
import { Uri } from '@arkts/project-detector'
import { createConnection, createServer, createTypeScriptProject, FileChangeType } from '@volar/language-server/node'
import * as ets from 'ohos-typescript'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { LanguageServerConfigManager } from './classes/config-manager'
import { logger } from './logger'
import { patchSemantic } from './patches/patch-semantic'

const connection = createConnection()
const server = createServer(connection)
const lspConfiguration = new LanguageServerConfigManager(logger)

logger.getConsola().info(`ETS Language Server is running: (pid: ${process.pid})`)

connection.onRequest('ets/waitForEtsConfigurationChangedRequested', (e) => {
  logger.getConsola().info(`waitForEtsConfigurationChangedRequested: ${JSON.stringify(e)}`)
  lspConfiguration.setConfiguration(e)
})

connection.onInitialize(async (params) => {
  if (params.locale) lspConfiguration.setLocale(params.locale)
  lspConfiguration.setConfiguration({ typescript: params.initializationOptions?.typescript })

  const tsdk = lspConfiguration.getTypeScriptTsdk()

  const projectDetectorManager = ProjectDetectorManager.create(params.workspaceFolders?.map(folder => folder.uri) ?? [])
  connection.onDidChangeWatchedFiles((e) => {
    try {
      for (const file of e.changes) {
        switch (file.type) {
          case FileChangeType.Changed:
            projectDetectorManager.emit('file-changed', Uri.file(file.uri))
            break
          case FileChangeType.Created:
            projectDetectorManager.emit('file-created', Uri.file(file.uri))
            break
          case FileChangeType.Deleted:
            projectDetectorManager.emit('file-deleted', Uri.file(file.uri))
            break
        }
      }
    }
    catch (error) {
      logger.getConsola().error('Error in change watched files handler:', error)
      console.error(error)
      // eslint-disable-next-line no-console
      console.trace(error)
    }
  })

  const arkTSServices = await createArkTServices(projectDetectorManager, ets, lspConfiguration)
  const typescriptServices = createTypeScriptServices(ets as unknown as typeof import('typescript'), {
    isValidationEnabled: document => !((document.languageId === 'json' || document.languageId === 'jsonc')),
    isSuggestionsEnabled: document => !((document.languageId === 'json' || document.languageId === 'jsonc')),
    isAutoClosingTagsEnabled: document => !((document.languageId === 'json' || document.languageId === 'jsonc')),
    isFormattingEnabled: document => !((document.languageId === 'json' || document.languageId === 'jsonc')),
    disableAutoImportCache: true,
  })
  patchSemantic(typescriptServices, lspConfiguration)

  // TODO
  connection.onRequest('ets/onDidChangeTextDocument', () => {})

  return server.initialize(
    params,
    createTypeScriptProject(ets as any, tsdk.diagnosticMessages, () => {
      return {
        languagePlugins: [
          ETSLanguagePlugin(ets, {
            excludePaths: [lspConfiguration.getSdkPath(), lspConfiguration.getHmsSdkPath()].filter(Boolean) as string[],
            tsdk: lspConfiguration.getTsdkPath(),
          }),
        ],
        setup(options) {
          if (!options.project || !options.project.typescript || !options.project.typescript.languageServiceHost) return

          const originalSettings = options.project.typescript.languageServiceHost.getCompilationSettings() || {}
          logger.getConsola().debug(`Settings: ${JSON.stringify(lspConfiguration.getTsConfig(originalSettings as ets.CompilerOptions), null, 2)}`)
          options.project.typescript.languageServiceHost.getCompilationSettings = () => {
            return lspConfiguration.getTsConfig(originalSettings as ets.CompilerOptions) as any
          }

          options.project.typescript.languageServiceHost.getScriptKind = ((fileName: string): ets.ScriptKind => {
            if (fileName.endsWith('.ets')) return ets.ScriptKind.ETS
            else if (fileName.endsWith('.js')) return ets.ScriptKind.JS
            else if (fileName.endsWith('.jsx')) return ets.ScriptKind.JSX
            else if (fileName.endsWith('.ts')) return ets.ScriptKind.TS
            else if (fileName.endsWith('.tsx')) return ets.ScriptKind.TSX
            else if (fileName.endsWith('.json')) return ets.ScriptKind.JSON
            else return ets.ScriptKind.Unknown
          }) as any
        },
      }
    }),
    [
      ...typescriptServices,
      ...arkTSServices,
    ],
  )
})

connection.listen()
connection.onInitialized(server.initialized)
connection.onShutdown(server.shutdown)
