import type { ConsolaInstance } from 'consola'
import type { LanguageServerLoggerOptions } from './lsp-logger'
import { createConsola } from 'consola'
import * as vscode from 'vscode'
import { version } from '../../../vscode/package.json'
import { ConsoleReporter } from './console-reporter'
import { OutputChannelReporter } from './ext-reporter'

export class ExtensionLogger {
  private static outputChannel: vscode.OutputChannel
  private debug: boolean = false
  private logger: ConsolaInstance
  private static extensionVersionIsLogged = false

  constructor(consolaOptions?: Partial<LanguageServerLoggerOptions>)
  constructor(prefix: string)
  constructor(consolaOptions: Partial<LanguageServerLoggerOptions> | string = {}) {
    const outputChannel = ExtensionLogger.outputChannel
      ? ExtensionLogger.outputChannel
      : vscode.window.createOutputChannel(`ETS Support Powered by Naily`, 'log')
    this.logger = createConsola({
      reporters: [
        new ConsoleReporter(this.debug, typeof consolaOptions === 'string' ? consolaOptions : (consolaOptions.prefix ?? '')),
        new OutputChannelReporter(outputChannel, 'Naily\'s ETS Support'),
      ],
    })
    ExtensionLogger.outputChannel = outputChannel
    if (!ExtensionLogger.extensionVersionIsLogged) {
      this.getConsola().info(`ETS Support Plugin version: ${version}`)
      ExtensionLogger.extensionVersionIsLogged = true
    }
  }

  getConsola(): ConsolaInstance {
    return this.logger
  }

  getOutputChannel(): vscode.OutputChannel {
    return ExtensionLogger.outputChannel
  }
}
