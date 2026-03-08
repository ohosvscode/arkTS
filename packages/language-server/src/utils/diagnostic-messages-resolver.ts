import type { LanguageServerLogger } from '@arkts/shared'
import type { InitializeParams } from '@volar/language-server/node'
import type { MapLike } from 'ohos-typescript'
import { loadTsdkByPath } from '@volar/language-server/node'
import { URI, Utils } from 'vscode-uri'

function safeLoadByRequire(params: InitializeParams, logger: LanguageServerLogger): MapLike<string> | undefined {
  try {
    const { diagnosticMessages } = loadTsdkByPath(params?.initializationOptions?.typescript?.tsdk, params?.locale)
    if (diagnosticMessages) {
      logger.getConsola().info(`Load diagnosticMessages by initialization options: ${params?.initializationOptions?.typescript?.tsdk}, locale: ${params.locale}`)
      return diagnosticMessages
    }
    else {
      logger.getConsola().warn(`Cannot load diagnosticMessages by initialization options: ${params?.initializationOptions?.typescript?.tsdk}, locale: ${params?.locale}`)
    }
  }
  catch (error) {
    logger.getConsola().error(`Load diagnosticMessages error by initialization options: ${params?.initializationOptions?.typescript?.tsdk}, locale: ${params?.locale}, error: `)
    error instanceof Error ? logger.getConsola().error(error.stack) : logger.getConsola().error(String(error))
  }
}

function loadTsdkInPackage(fileUri: string, locale: string | undefined, logger: LanguageServerLogger): MapLike<string> | undefined {
  const uri = URI.parse(fileUri)
  const dirUri = Utils.joinPath(uri, '..')
  const libUri = Utils.joinPath(dirUri, 'lib')

  function loadLocalizedDiagnosticMessages(): MapLike<string> | undefined {
    if (locale === 'en') {
      logger.getConsola().info('Detect locale is en, skip load diagnosticMessages.')
      return
    }
    // webpack compatibility
    // eslint-disable-next-line no-eval
    const _require: NodeJS.Require = eval('require')

    try {
      const path = _require.resolve(`./${locale}/diagnosticMessages.generated.json`, { paths: [libUri.fsPath] })
      const res = _require(path)
      logger.getConsola().info(`Loaded diagnostic messages from language server package.`)
      return res
    }
    catch (error) {
      logger.getConsola().error(`Load diagnosticMessages error by package, error: `)
      error instanceof Error ? logger.getConsola().error(error.stack) : logger.getConsola().error(String(error))
    }
  }

  return loadLocalizedDiagnosticMessages()
}

export async function resolveDiagnosticMessages(params: InitializeParams, logger: LanguageServerLogger, fileUri: string): Promise<MapLike<string> | undefined> {
  if (!params.locale) {
    logger.getConsola().warn(`Locale is ${params.locale}, skip load diagnostic messages.`)
    return
  }
  if (params.initializationOptions?.typescript?.tsdk && params.locale) {
    const loadedDiagnosticMessages = safeLoadByRequire(params, logger)
    if (loadedDiagnosticMessages) return loadedDiagnosticMessages
  }
  const loadedPackageDiagnosticMessagesByPackage = loadTsdkInPackage(fileUri, params.locale, logger)
  if (loadedPackageDiagnosticMessagesByPackage) return loadedPackageDiagnosticMessagesByPackage
  logger.getConsola().warn(`Cannot load diagnosticMessages by initialization options: ${params?.initializationOptions?.typescript?.tsdk}, locale: ${params?.initializationOptions?.locale}`)
}
