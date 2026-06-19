import type { LabsInfo } from '@volar/vscode'
import type { ServerOptions } from '@volar/vscode/node'
import { LanguageClient, TransportKind } from '@volar/vscode/node'
import * as vscode from 'vscode'
import { AbstractLanguageServer } from '../common/abstract-language-server'

export default class LanguageServer extends AbstractLanguageServer {
  constructor(protected readonly context: vscode.ExtensionContext) {
    super(context)
  }

  private getServerOptions(): ServerOptions {
    const serverModule = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'arkts-server-node.js')

    return {
      run: {
        module: serverModule.fsPath,
        transport: TransportKind.ipc,
        options: {
          execArgv: [] as string[],
        },
      },
      debug: {
        module: serverModule.fsPath,
        transport: TransportKind.ipc,
        options: {
          execArgv: ['--nolazy', `--inspect=${6009}`],
        },
      },
    }
  }

  async start(): Promise<LabsInfo> {
    return super.startLanguageClient(
      new LanguageClient(
        'ets-language-server',
        'ETS Language Server',
        this.getServerOptions(),
        {
          initializationOptions: await this.getInitializationOptions(),
          outputChannel: this.getOutputChannel(),
          documentSelector: ['arkts'],
        },
      ),
    )
  }
}
