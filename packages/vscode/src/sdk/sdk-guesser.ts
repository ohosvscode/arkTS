import type { SdkVersion } from '@arkts/sdk-downloader'
import fs from 'node:fs'
import path from 'node:path'
import { ExtensionLogger } from '@arkts/shared/vscode'
import JSON5 from 'json5'
import { Autowired, Service } from 'unioc'
import { IOnActivate, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { SdkInstaller } from './sdk-installer'
import { SdkManager } from './sdk-manager'

@Service
export class SdkVersionGuesser implements IOnActivate {
  @Autowired
  protected readonly sdkManager: SdkManager

  @Autowired
  protected readonly sdkInstaller: SdkInstaller

  @Autowired(Translator)
  protected readonly translator: Translator

  @Autowired
  protected readonly logger: ExtensionLogger

  onActivate(): void {
    this.openGuessOhosSdkVersionDialog()
  }

  async openGuessOhosSdkVersionDialog(): Promise<keyof typeof SdkVersion | undefined> {
    const guessedOhosSdkVersion = await this.getGuessedOhosSdkVersion()
    this.logger.getConsola().info(`Guessed OpenHarmony SDK version: ${guessedOhosSdkVersion}`)
    if (!guessedOhosSdkVersion) return
    const [sdkStringVersion, sdkNumberVersion] = guessedOhosSdkVersion
    const currentSdkPath = await this.sdkManager.getAnalyzedSdkPath(this)
    const currentSdkAnalyzer = await this.sdkManager.getAnalyzedSdkAnalyzer(this)

    // Check if the current SDK is the same as the guessed SDK.
    if (currentSdkPath) {
      const ohUniPackageJsonPath = path.resolve(currentSdkPath, 'ets', 'oh-uni-package.json')
      if (fs.existsSync(ohUniPackageJsonPath)) {
        const ohUniPackageJson = JSON.parse(fs.readFileSync(ohUniPackageJsonPath, 'utf-8'))
        const compileSdkVersion: string = ohUniPackageJson?.apiVersion || ''
        if (compileSdkVersion === String(sdkNumberVersion)) return
      }
    }

    // Check if the guessed SDK is installed.
    if (await this.sdkManager.isInstalled(sdkNumberVersion.toString())) {
      const choiceYes = this.translator.t('sdk.guess.switch.yes')
      const choiceNo = this.translator.t('sdk.guess.switch.no')
      const choiceResult = await vscode.window.showInformationMessage(
        this.translator.t('sdk.guess.switch.title', sdkStringVersion),
        choiceYes,
        choiceNo,
      )
      if (choiceResult === choiceYes) {
        const inferredSdkPosition = currentSdkAnalyzer?.getIdentifier()
        const targetSdkPath = path.join(await this.sdkManager.getOhosSdkBasePath(), sdkNumberVersion.toString())
        await this.sdkManager.setOhosSdkPath(targetSdkPath, inferredSdkPosition === 'global' ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace)
        vscode.window.showInformationMessage(this.translator.t('sdk.guess.switch.success', sdkStringVersion))
      }
      return
    }

    // If not installed, ask the user install the SDK or not in the base SDK path.
    const choiceYes = this.translator.t('sdk.guess.install.yes')
    const choiceNo = this.translator.t('sdk.guess.install.no')
    const choiceResult = await vscode.window.showInformationMessage(
      this.translator.t('sdk.guess.install.title', sdkStringVersion),
      choiceYes,
      choiceNo,
    )
    if (choiceResult === choiceYes) await this.sdkInstaller.installSdk(sdkStringVersion)
  }

  /** Guess the OpenHarmony SDK version from the current workspace's build-profile.json5 file. */
  async getGuessedOhosSdkVersion(): Promise<[keyof typeof SdkVersion, number] | undefined | void> {
    const currentWorkspaceDir = vscode.workspace.workspaceFolders?.[0]?.uri
    if (!currentWorkspaceDir) return

    const buildProfileFilePath = vscode.Uri.joinPath(currentWorkspaceDir, 'build-profile.json5')
    const buildProfile = await vscode.workspace.fs.readFile(buildProfileFilePath)
      .then(content => JSON5.parse(content.toString()), () => undefined)
      .then(v => v, () => undefined)
    if (!buildProfile) return this.logger.getConsola().error(`Failed to guess OpenHarmony SDK version from workspace 1: ${currentWorkspaceDir.fsPath}'s build-profile.json5: ${buildProfileFilePath.fsPath}`)

    try {
      const compileSdkVersion: string | number | undefined = buildProfile?.app?.products?.[0]?.compileSdkVersion
      if (!compileSdkVersion) return

      let sdkVersion: number

      // Handle different formats of compileSdkVersion
      if (typeof compileSdkVersion === 'string') {
        // For HarmonyOS format like "6.0.0(20)", extract the number in parentheses
        const harmonyOsMatch = compileSdkVersion.match(/\((\d+)\)$/)
        if (harmonyOsMatch) {
          sdkVersion = Number(harmonyOsMatch[1])
        }
        else {
          // For OpenHarmony format like "20", parse directly
          sdkVersion = Number(compileSdkVersion)
        }
      }
      else if (typeof compileSdkVersion === 'number') {
        // Legacy numeric format
        sdkVersion = compileSdkVersion
      }
      else {
        return
      }

      if (!sdkVersion || Number.isNaN(sdkVersion)) return

      switch (sdkVersion) {
        case 10: return ['API10', 10]
        case 11: return ['API11', 11]
        case 12: return ['API12', 12]
        case 13: return ['API13', 13]
        case 14: return ['API14', 14]
        case 15: return ['API15', 15]
        case 18: return ['API18', 18]
        case 20: return ['API20', 20]
      }
    }
    catch (error) {
      this.logger.getConsola().error(error)
      this.logger.getConsola().error(`Failed to parse build-profile.json5: ${buildProfileFilePath.fsPath}`)
    }
  }
}
