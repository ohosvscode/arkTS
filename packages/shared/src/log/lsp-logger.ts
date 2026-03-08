import type { ConsolaInstance, ConsolaOptions, ConsolaReporter } from 'consola'
import { createConsola } from 'consola/basic'
import { version } from '../../../language-server/package.json'
import { ConsoleReporter } from './console-reporter'
import { FileReporter } from './file-reporter'

export interface LanguageServerLoggerOptions extends ConsolaOptions {
  /** @default 'ETS Language Server' */
  prefix?: string
  /** @default '.arkts/logs/language-server.log' */
  filename?: string
  /** @default false */
  console?: boolean
  /** @default false */
  file?: boolean
}

export class LanguageServerLogger {
  private logger: ConsolaInstance
  private debug: boolean = false
  private static versionIsLogged = false

  constructor(consolaOptions: Partial<LanguageServerLoggerOptions> = {}) {
    this.logger = createConsola({
      ...consolaOptions,
      reporters: [
        consolaOptions.console ? new ConsoleReporter(this.debug, consolaOptions.prefix ?? '') : undefined,
        consolaOptions.file ? new FileReporter(this.debug, consolaOptions.prefix ?? 'ETS Language Server', consolaOptions.filename ?? '.arkts/logs/language-server.log') : undefined,
        ...(consolaOptions.reporters || []),
      ].filter(Boolean) as ConsolaReporter[],
    })
    if (!LanguageServerLogger.versionIsLogged) {
      this.logger.info(`ETS Support language server version: ${version}`)
      LanguageServerLogger.versionIsLogged = true
    }
  }

  getConsola(): ConsolaInstance {
    return this.logger
  }

  setDebug(debug: boolean): this {
    this.debug = debug
    return this
  }

  getDebug(): boolean {
    return this.debug
  }
}
