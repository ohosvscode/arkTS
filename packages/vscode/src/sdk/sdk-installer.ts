import path from 'node:path'
import { createDownloader, DownloadError, getSdkUrl, getSdkUrls, SdkVersion as SdkVersionEnum } from '@arkts/sdk-downloader'
import { Autowired } from 'unioc'
import { Command, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { Environment } from '../environment'
import { SdkManager } from './sdk-manager'

interface SdkQuickPickItem extends vscode.QuickPickItem {
  /** Current install status of the SDK. */
  installStatus: 'incomplete' | boolean
  /** The version of the SDK. */
  version: keyof typeof SdkVersionEnum
}

@Command('ets.installSDK')
export class SdkInstaller extends Environment implements Command {
  @Autowired(Translator)
  protected readonly translator: Translator

  @Autowired
  protected readonly sdkManager: SdkManager

  private async buildQuickPickItem(urls: ReturnType<typeof getSdkUrls>): Promise<SdkQuickPickItem[]> {
    return (await Promise.all(Object.entries(urls).map(async ([openHarmonyVersion]) => {
      const apiVersion = Object.keys(SdkVersionEnum).find(key => SdkVersionEnum[key as keyof typeof SdkVersionEnum] === openHarmonyVersion) as keyof typeof SdkVersionEnum
      const installStatus = await this.sdkManager.isInstalled(apiVersion.toString().split('API')[1])
      const installStatusTranslation = installStatus === 'incomplete' ? this.translator.t('sdk.install.incomplete') : installStatus ? this.translator.t('sdk.install.installed') : this.translator.t('sdk.install.notInstalled')

      return {
        label: apiVersion,
        description: `OpenHarmony ${apiVersion} Release`,
        detail: `OpenHarmony ${SdkVersionEnum[apiVersion as keyof typeof SdkVersionEnum]} Release (${installStatusTranslation})`,
        installStatus,
        version: apiVersion as keyof typeof SdkVersionEnum,
      } satisfies SdkQuickPickItem
    }))).filter(Boolean) as SdkQuickPickItem[]
  }

  async onExecuteCommand(): Promise<void> {
    const urls = getSdkUrls()
    const quickPickItems = await this.buildQuickPickItem(urls)
    const versionChoice = await vscode.window.showQuickPick(quickPickItems, {
      canPickMany: false,
      title: this.translator.t('sdk.install.title'),
      placeHolder: this.translator.t('sdk.install.placeHolder'),
    })

    if (!versionChoice || !versionChoice.label) return

    if (versionChoice.installStatus === false) {
      await this.installSdk(versionChoice.version)
      return
    }

    const choiceSwitch = this.translator.t('sdk.install.switchOrReinstall.switch')
    const choiceReinstall = this.translator.t('sdk.install.switchOrReinstall.reinstall')
    const choice = await vscode.window.showQuickPick([
      {
        label: choiceSwitch,
        description: this.translator.t('sdk.install.switchOrReinstall.switch.description', versionChoice.version),
        detail: this.translator.t('sdk.install.switchOrReinstall.switch.detail'),
        iconPath: new vscode.ThemeIcon('check'),
      },
      {
        label: choiceReinstall,
        description: this.translator.t('sdk.install.switchOrReinstall.reinstall.description', versionChoice.version),
        detail: this.translator.t('sdk.install.switchOrReinstall.reinstall.detail'),
        iconPath: new vscode.ThemeIcon('refresh'),
      },
    ] satisfies vscode.QuickPickItem[], {
      canPickMany: false,
      title: this.translator.t('sdk.install.switchOrReinstall.title'),
    })

    if (!choice || !choice.label) return

    if (choice?.label === choiceSwitch) {
      await this.sdkManager.setOhosSdkPath(path.join(await this.sdkManager.getOhosSdkBasePath(), versionChoice.version.split('API')[1]))
      vscode.window.showInformationMessage(this.translator.t('sdk.install.switchOrReinstall.switch.success', versionChoice.version))
    }
    else if (choice?.label === choiceReinstall) {
      await this.installSdk(versionChoice.version)
    }
  }

  /**
   * Install the SDK.
   *
   * It will open a {@linkcode vscode.window.withProgress} to install the SDK.
   *
   * @param version - The version of the SDK.
   */
  async installSdk(version: keyof typeof SdkVersionEnum): Promise<void> {
    const baseSdkPath = await this.sdkManager.getOhosSdkBasePath()
    const url = getSdkUrl(SdkVersionEnum[version], this.getArch(), this.getOS())
    if (!url) throw new Error('Current SDK version is not supported by the current platform.')
    const apiNumberVersion = version.toString().split('API')[1]

    const downloader = await createDownloader({
      url,
      cacheDir: path.join(baseSdkPath, '.tmp', apiNumberVersion),
      targetDir: path.join(baseSdkPath, apiNumberVersion),
      resumeDownload: true,
    })

    // Step 1: Download the SDK
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: this.translator.t('sdk.install.installing', version),
      cancellable: true,
    }, async (progress, token) => {
      if (token.isCancellationRequested) return

      try {
        const abortController = new AbortController()
        token.onCancellationRequested(() => {
          abortController.abort()
          vscode.window.showInformationMessage(this.translator.t('sdk.install.cancelled', version))
        })
        downloader.on('download-progress', (e) => {
          progress.report({
            increment: e.increment,
            message: `${e.percentage.toFixed(2)}% ${e.network.toFixed(2)}${e.unit}/s`,
          })
          this.getConsola().info(`Downloading SDK ${apiNumberVersion}: ${e.percentage.toFixed(2)}% ${e.network.toFixed(2)}${e.unit}/s`)
        })

        await downloader.startDownload({ signal: abortController.signal })
      }
      catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return console.warn(`ArkTS SDK download has been canceled!`)
        if (error instanceof DownloadError) {
          vscode.window.showErrorMessage(`下载错误: ${error.code} ${error.message}`)
        }
        else {
          vscode.window.showErrorMessage(`下载错误: ${(error && typeof error === 'object' && 'message' in error) ? error.message : '未知错误'}`)
        }

        console.error(error)
        throw error
      }
    })

    // Step 2: Check the SHA256 of the SDK
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: this.translator.t('sdk.install.checkingSha256', version),
      cancellable: true,
    }, async (_progress, token) => {
      if (token.isCancellationRequested) return
      await downloader.checkSha256()
    })

    // Step 3: Extract the SDK (tar.gz)
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: this.translator.t('sdk.install.extractingTar', version),
      cancellable: false,
    }, async (progress, token) => {
      if (token.isCancellationRequested) return

      downloader.on('tar-extracted', (e) => {
        progress.report({
          message: this.translator.t('sdk.install.extractingTar', e.path),
        })
        this.getConsola().info(`Extracting tar.gz API ${apiNumberVersion}: ${e.path}`)
      })
      downloader.on('zip-extracted', (e) => {
        progress.report({
          message: this.translator.t('sdk.install.extractingZip', e.path),
        })
        this.getConsola().info(`Extracting zip API ${apiNumberVersion}: ${e.path}`)
      })
      await downloader.extractTar()
    })

    // Step 4: Extract the SDK (zip, inside the tar.gz)
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: this.translator.t('sdk.install.extractingZip', version),
      cancellable: false,
    }, async (progress, token) => {
      if (token.isCancellationRequested) return
      downloader.on('zip-extracted', (e) => {
        progress.report({
          message: this.translator.t('sdk.install.extractingZip', e.path),
        })
        this.getConsola().info(`Extracting zip API ${apiNumberVersion}: ${e.path}`)
      })
      await downloader.extractZip()
    })

    downloader.clean().catch((error) => {
      console.error(error)
      this.getConsola().error(`Failed to clean up the SDK installer: ${error.message}`)
    })

    // Step 5: Check the install status of the SDK
    const installStatus = await this.sdkManager.isInstalled(apiNumberVersion)
    if (installStatus === 'incomplete') {
      await vscode.window.showWarningMessage(this.translator.t('sdk.install.mayBeIncomplete', version))
      return
    }
    else if (!installStatus) {
      await vscode.window.showErrorMessage(this.translator.t('sdk.install.mayBeError', version))
      return
    }

    // Step 6: Show the success message, and ask the user if they want to switch to the new SDK
    vscode.window.showInformationMessage(this.translator.t('sdk.install.success', version))
    const isSwitchToNewSdkYes = this.translator.t('sdk.install.isSwitchToNewSdk.yes')
    const isSwitchToNewSdkNo = this.translator.t('sdk.install.isSwitchToNewSdk.no')
    const isSwitchToNewSdk = await vscode.window.showInformationMessage(
      this.translator.t('sdk.install.isSwitchToNewSdk.title', version),
      {
        modal: true,
      },
      isSwitchToNewSdkYes,
      isSwitchToNewSdkNo,
    )
    if (isSwitchToNewSdk === isSwitchToNewSdkYes) {
      await this.sdkManager.setOhosSdkPath(path.join(baseSdkPath, apiNumberVersion))
      vscode.window.showInformationMessage(this.translator.t('sdk.install.isSwitchToNewSdk.success', version))
    }
    else {
      vscode.window.showInformationMessage(this.translator.t('sdk.install.isSwitchToNewSdk.cancel', version))
    }
  }
}
