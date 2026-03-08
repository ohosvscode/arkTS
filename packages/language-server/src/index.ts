/* eslint-disable import/first */
import { createRequire } from 'node:module'
import { logger } from './logger'

// Polyfill require for ESM compatibility with ohos-typescript
const fileUri = import.meta.url
const require = createRequire(fileUri)
globalThis.require = require
logger.getConsola().info(`Current file URI: ${fileUri}`)

import { ETSLanguagePlugin } from '@arkts/language-plugin'
import { createArkTServices } from '@arkts/language-service'
import { format } from '@ohos-rs/oxk'
import { createConnection, createServer, createTypeScriptProject } from '@volar/language-server/node'
import * as ets from 'ohos-typescript'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { createNodeFileSystem } from 'vscode-fs'
import { URI, Utils } from 'vscode-uri'
import { ConfigResolver } from './classes/config-resolver'
import { ProjectDetectorManagerService } from './classes/project-manager'
import { patchSemantic } from './patches/patch-semantic'
import { resolveDiagnosticMessages } from './utils/diagnostic-messages-resolver'

const connection = createConnection()
const server = createServer(connection)

connection.onRequest('ets/formatDocument', async e => format(e.textDocument.uri, e.textDocument.text))

connection.onInitialize(async (params) => {
  const diagnosticMessages = await resolveDiagnosticMessages(params, logger, fileUri)
  const projectDetectorManagerService = new ProjectDetectorManagerService(connection, params, logger)
  const fs = await createNodeFileSystem()
  const configuration = await new ConfigResolver(logger, projectDetectorManagerService, params, fs, Utils.joinPath(URI.parse(fileUri), '..').fsPath, connection).validateOrExit()
  const configurator = configuration.toArkTSServicesOptions()
  const typescriptServices = createTypeScriptServices(ets as unknown as typeof import('typescript'))
  patchSemantic(typescriptServices, configurator) // patch typescript semantic service
  const arktsServices = await createArkTServices(configurator, ets)

  delete typescriptServices[1].capabilities.documentFormattingProvider
  const originalCreate = typescriptServices[1].create
  typescriptServices[1].create = (context) => {
    const instance = originalCreate(context)
    delete instance.provideDocumentFormattingEdits
    return instance
  }

  return server.initialize(
    params,
    createTypeScriptProject(
      ets as unknown as typeof import('typescript'),
      diagnosticMessages,
      async (ctx) => {
        const mergedSettings = await configuration.toCompilationSettings()
        ctx.projectHost.getCompilationSettings = () => mergedSettings as import('typescript').CompilerOptions

        return {
          languagePlugins: [
            ETSLanguagePlugin(ets, {
              excludePaths: [configuration.getSdkPath(), configuration.getHmsSdkPath()].filter(Boolean) as string[],
              tsdk: configuration.getTsdkPath(),
            }),
          ],
          setup: async (options) => {
            if (!options.project || !options.project.typescript || !options.project.typescript.languageServiceHost) return
            options.project.typescript.languageServiceHost.getScriptKind = ((fileName: string): ets.ScriptKind => {
              if (fileName.endsWith('.ets')) return ets.ScriptKind.ETS
              else if (fileName.endsWith('.js')) return ets.ScriptKind.JS
              else if (fileName.endsWith('.jsx')) return ets.ScriptKind.JSX
              else if (fileName.endsWith('.ts')) return ets.ScriptKind.TS
              else if (fileName.endsWith('.tsx')) return ets.ScriptKind.TSX
              else if (fileName.endsWith('.json') || fileName.endsWith('.json5')) return ets.ScriptKind.JSON
              else return ets.ScriptKind.Unknown
            }) as (fileName: string) => import('typescript').ScriptKind
          },
        }
      },
    ),
    [
      ...typescriptServices,
      ...arktsServices,
    ],
  )
})

connection.onInitialized(() => {
  logger.getConsola().info('ETS Language Server is initialized.')
  server.initialized()
})
connection.onShutdown(server.shutdown)
logger.getConsola().info('ETS Language Server is starting...')
connection.listen()
logger.getConsola().info('ETS Language Server is started!')
