import { Autowired, Service } from 'unioc'
import * as vscode from 'vscode'
import which from 'which'
import { SdkVersionGuesser } from './sdk/sdk-guesser'
import { SdkManager } from './sdk/sdk-manager'

@Service
export class HdcManager {
  @Autowired
  private readonly sdkManager: SdkManager

  @Autowired
  private readonly sdkVersionGuesser: SdkVersionGuesser

  private async getHdcPathFromConfiguration(): Promise<string | null> {
    const sdkPath = await this.sdkManager.getAnalyzedSdkPath(this.sdkVersionGuesser)
    if (!sdkPath) return null
    const hdcPath = vscode.Uri.joinPath(vscode.Uri.file(sdkPath), 'toolchains', 'hdc')
    const hdcExists = await vscode.workspace.fs.stat(hdcPath).then(
      stat => stat.type === vscode.FileType.File,
      () => false,
    )
    if (!hdcExists) return null
    return hdcPath.fsPath
  }

  async getHdcPath(): Promise<string | null> {
    const configurationHdcPath = await this.getHdcPathFromConfiguration()
    if (configurationHdcPath) return configurationHdcPath
    return which.sync('hdc', { nothrow: true }) ?? null
  }
}
