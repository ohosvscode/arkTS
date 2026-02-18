import { createImageManager, ImageManager } from '@arkts/image-manager'
import { Autowired, Service } from 'unioc'
import { Command, ExtensionContext, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import which from 'which'
import { SdkVersionGuesser } from './sdk/sdk-guesser'
import { SdkManager } from './sdk/sdk-manager'

const GLOBAL_STATE_KEY_CURRENT_CONNECT = 'ets.hdc.currentConnectKey'

export type CurrentConnectKey = |
  string // 已选择设备
  | 0 // 未选择设备
  | -1 // 未连接设备

@Service
@Command('ets.copyHdcPathToClipboard')
export class HdcManager implements Command {
  @Autowired
  private readonly sdkManager: SdkManager

  @Autowired(Translator)
  private readonly translator: Translator

  @Autowired(ExtensionContext)
  private readonly extensionContext: vscode.ExtensionContext

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

  private currentConnectKey: CurrentConnectKey = 0

  setCurrentConnectKey(connectKey: CurrentConnectKey): void {
    this.currentConnectKey = connectKey
    const stored: string | number | undefined = connectKey === 0 ? '0' : connectKey
    void this.extensionContext.globalState.update(GLOBAL_STATE_KEY_CURRENT_CONNECT, stored)
  }

  getCurrentConnectKey(): CurrentConnectKey {
    if (this.currentConnectKey !== 0) return this.currentConnectKey
    const stored = this.extensionContext.globalState.get<string | number>(GLOBAL_STATE_KEY_CURRENT_CONNECT)
    if (stored === undefined || stored === '0') return 0
    if (stored === -1) return -1
    const key = stored as CurrentConnectKey
    this.currentConnectKey = key
    return key
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
