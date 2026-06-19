import { createConnection, createServer, createTypeScriptProject } from '@volar/language-server/node'
import * as arkts from 'ohos-typescript'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { resolveDiagnosticMessages } from './diagnostic-messages-resolver'
import { createArkTSInitializer } from './initialize'
import { ArkTSLanguagePlugin } from './language-plugin'
import { patchSemantic } from './patches'

const fileUri = import.meta.url
const connection = createConnection()
const server = createServer(connection)

connection.onInitialize(async (params) => {
  const initializer = await createArkTSInitializer(server, arkts, params, 'node', fileUri)
  const typescriptServices = createTypeScriptServices(arkts as any)
  const diagnosticMessages = await resolveDiagnosticMessages(params, fileUri)
  patchSemantic(typescriptServices[0], params.initializationOptions)

  return server.initialize(
    params,
    createTypeScriptProject(arkts as any, diagnosticMessages, () => ({
      languagePlugins: [ArkTSLanguagePlugin()],
      setup: options => initializer.patchProject(options.project),
    })),
    typescriptServices,
  )
})

connection.onInitialized(server.initialized)
connection.onShutdown(server.shutdown)
connection.listen()
