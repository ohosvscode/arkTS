import type { LabsInfo } from '@volar/vscode'
import { LanguageClient } from '@volar/vscode/browser'
import * as vscode from 'vscode'
import { AbstractLanguageServer } from '../common/abstract-language-server'

export default class LanguageServer extends AbstractLanguageServer {
  constructor(protected readonly context: vscode.ExtensionContext) {
    super(context)
  }

  async start(): Promise<LabsInfo> {
    return super.startLanguageClient(
      new LanguageClient(
        'ets-language-server',
        'ETS Language Server',
        {
          initializationOptions: await this.getInitializationOptions(),
          outputChannel: this.getOutputChannel(),
          documentSelector: ['arkts'],
        },
        new Worker(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'arkts-server-browser.js').toString()),
      ),
    )
  }
}
