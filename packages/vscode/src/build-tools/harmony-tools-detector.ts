import type { HarmonyToolsKind } from './detect-harmony-tools'
import { ExtensionLogger } from '@arkts/shared/vscode'
import { Autowired, Service } from 'unioc'
import { Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { SdkManager } from '../sdk/sdk-manager'
import { detectHarmonyTools } from './detect-harmony-tools'

@Service
export class HarmonyToolsDetector {
  @Autowired private readonly logger: ExtensionLogger
  @Autowired(Translator) private readonly translator: Translator
  @Autowired private readonly sdkManager: SdkManager

  /**
   * When `ets.buildTools.autoDetect` is enabled and `ets.sdkPath` is empty,
   * detect Command-line-tools / DevEco Studio and write the OpenHarmony SDK path.
   */
  async maybeAutoFillSdkPath(): Promise<string | undefined> {
    if (!this.isAutoDetectEnabled()) return
    if (this.hasConfiguredSdkPath()) return

    const detected = await detectHarmonyTools()
    if (!detected) {
      this.logger.getConsola().info('HarmonyToolsDetector: no HarmonyOS tools environment detected')
      return
    }

    await this.sdkManager.setOhosSdkPath(detected.openHarmonySdkPath, vscode.ConfigurationTarget.Global)
    this.logger.getConsola().info(`HarmonyToolsDetector: filled ets.sdkPath from ${detected.kind}: ${detected.openHarmonySdkPath}`)
    void vscode.window.showInformationMessage(
      this.translator.t('buildTools.autoDetect.success', this.getKindLabel(detected.kind), detected.openHarmonySdkPath),
    )
    return detected.openHarmonySdkPath
  }

  private isAutoDetectEnabled(): boolean {
    return vscode.workspace.getConfiguration('ets').get<boolean>('buildTools.autoDetect', true)
  }

  private hasConfiguredSdkPath(): boolean {
    const inspected = vscode.workspace.getConfiguration('ets').inspect<string>('sdkPath')
    const values = [inspected?.workspaceFolderValue, inspected?.workspaceValue, inspected?.globalValue]
    return values.some(value => typeof value === 'string' && value.trim() !== '')
  }

  private getKindLabel(kind: HarmonyToolsKind): string {
    return kind === 'command-line-tools' ? 'command-line-tools' : 'DevEco Studio'
  }
}
