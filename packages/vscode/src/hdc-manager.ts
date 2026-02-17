import { createImageManager, ImageManager } from '@arkts/image-manager'
import { Autowired, Service } from 'unioc'
import { Command, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import which from 'which'
import { SdkVersionGuesser } from './sdk/sdk-guesser'
import { SdkManager } from './sdk/sdk-manager'

@Service
@Command('ets.copyHdcPathToClipboard')
export class HdcManager implements Command {
  @Autowired
  private readonly sdkManager: SdkManager

  @Autowired(Translator)
  private readonly translator: Translator

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

  async createImageManager(): Promise<ImageManager> {
    return createImageManager({
      imageBasePath: await vscode.workspace.getConfiguration('ets').get('localImagePath'),
      configPath: await vscode.workspace.getConfiguration('ets').get('imageConfigPath'),
      deployedPath: await vscode.workspace.getConfiguration('ets').get('deployedEmulatorPath'),
      emulatorPath: await vscode.workspace.getConfiguration('ets').get('emulatorPath'),
      logPath: await vscode.workspace.getConfiguration('ets').get('emulatorLogPath'),
      sdkPath: await this.sdkManager.getAnalyzedSdkPath(this.sdkVersionGuesser),
    })
  }

  onExecuteCommand(): void {
    this.getHdcPath().then(async (hdcPath) => {
      if (hdcPath) {
        await vscode.env.clipboard.writeText(hdcPath)
        vscode.window.showInformationMessage(this.translator.t('copySuccess'))
      }
      else {
        vscode.window.showInformationMessage(this.translator.t('hdcManager.copyHdcPath.error'))
      }
    })
  }
}
