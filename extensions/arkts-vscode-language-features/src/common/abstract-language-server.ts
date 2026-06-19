import type { ArkTSInitializationOptions } from '@arkts/language-server'
import type { BaseLanguageClient, LabsInfo } from '@volar/vscode'
import type { UserInstance } from './types'
import { createLabsInfo } from '@volar/vscode'
import * as vscode from 'vscode'
import { BaseOutputChannel } from './output-channel'

export abstract class AbstractLanguageServer extends BaseOutputChannel implements UserInstance {
  constructor(protected readonly context: vscode.ExtensionContext) {
    super()
  }

  private client?: BaseLanguageClient

  async getInitializationOptions(): Promise<ArkTSInitializationOptions> {
    return {
      ets: {
        sdkPath: vscode.workspace.getConfiguration('ets').get<string>('sdkPath') ?? '',
      },
    }
  }

  abstract start(): Promise<LabsInfo>

  async startLanguageClient<T extends BaseLanguageClient>(client: T): Promise<LabsInfo> {
    this.client = client
    this.client.clientOptions.initializationOptions = await this.getInitializationOptions()
    this.client.clientOptions.outputChannel = this.getOutputChannel()
    this.client.clientOptions.documentSelector = ['arkts']
    await this.client.start()
    const labsInfo = createLabsInfo()
    labsInfo.addLanguageClient(this.client)
    return labsInfo.extensionExports
  }

  deactivate(): void {
    this.client?.stop()
    this.client?.dispose()
    this.client = undefined
  }
}
