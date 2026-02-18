import * as vscode from 'vscode'
import { version } from '../../../vscode/package.json'
import { OutputChannelReporter } from './ext-reporter'
import { LanguageServerLogger } from './lsp-logger'

export class ExtensionLogger extends LanguageServerLogger {
  private static outputChannel: vscode.OutputChannel
  private static extensionVersionIsLogged = false

  constructor() {
    const outputChannel = ExtensionLogger.outputChannel
      ? ExtensionLogger.outputChannel
      : vscode.window.createOutputChannel(`ETS Support Powered by Naily`, 'log')
    super({
      reporters: [
        new OutputChannelReporter(outputChannel, 'Naily\'s ETS Support'),
      ],
      prefix: 'Naily\'s ETS Support',
    })
    ExtensionLogger.outputChannel = outputChannel
    if (!ExtensionLogger.extensionVersionIsLogged) {
      this.getConsola().info(`ETS Support Plugin version: ${version}`)
      ExtensionLogger.extensionVersionIsLogged = true
    }
  }

  getOutputChannel(): vscode.OutputChannel {
    return ExtensionLogger.outputChannel
  }
}
