import child_process from 'node:child_process'
import { timeout } from '@vstils/core'
import { Autowired } from 'unioc'
import { Command, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { commands } from '../../generated/meta'
import { HdcManager } from '../../hdc-manager'

@Command('ets.connectDevice')
export class ConnectDeviceCommand implements Command {
  @Autowired(Translator) protected readonly translator: Translator
  @Autowired protected readonly hdcManager: HdcManager

  async onExecuteCommand(): Promise<void> {
    const connectByIPTitle = this.translator.t('hdcManager.connectDeviceDialog.connectByIP.title')
    const connectByIPDetail = this.translator.t('hdcManager.connectDeviceDialog.connectByIP.detail')
    const openDeviceManagerTitle = this.translator.t('hdcManager.connectDeviceDialog.openDeviceManager.title')
    const openDeviceManagerDetail = this.translator.t('hdcManager.connectDeviceDialog.openDeviceManager.detail')
    const connecting = this.translator.t('connectingWithDot')

    const dialog = await vscode.window.showQuickPick([
      { label: connectByIPTitle, iconPath: new vscode.ThemeIcon('globe'), detail: connectByIPDetail },
      { label: openDeviceManagerTitle, iconPath: new vscode.ThemeIcon('device-desktop'), detail: openDeviceManagerDetail },
    ])
    if (!dialog) return
    if (dialog.label === connectByIPTitle) {
      const ip = await vscode.window.showInputBox({
        title: connectByIPTitle,
        prompt: this.translator.t('hdcManager.connectDeviceDialog.connectByIP.prompt'),
        placeHolder: this.translator.t('hdcManager.connectDeviceDialog.connectByIP.placeholder'),
      })
      if (!ip) return
      const hdcPath = await this.hdcManager.getHdcPath()
      if (!hdcPath) return
      const abortController = new AbortController()
      vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: connecting, cancellable: true }, async (_, token) => {
        if (token.isCancellationRequested) return
        token.onCancellationRequested(() => abortController.abort())

        await timeout(async () => {
          return new Promise((resolve, reject) => {
            child_process.execFile(hdcPath, ['tconn', ip], { signal: abortController.signal }, (error, stdout, stderr) => {
              if (error) {
                vscode.window.showErrorMessage(this.translator.t('hdcManager.connectDeviceDialog.connectByIP.error', ip, String(error)))
                return reject(error)
              }
              else if (stdout.includes('Connect OK') || stderr.includes('Connect OK')) {
                vscode.window.showInformationMessage(this.translator.t('hdcManager.connectDeviceDialog.connectByIP.success', ip))
                return resolve(true)
              }
              else {
                vscode.window.showErrorMessage(this.translator.t('hdcManager.connectDeviceDialog.connectByIP.error', ip, `${stdout} ${stderr}`))
                return reject(new Error(`${stdout} ${stderr}`))
              }
            })
          })
        }, 10000, new Error('Connect timeout'))
      })
    }
    else if (dialog.label === openDeviceManagerTitle) {
      vscode.commands.executeCommand(commands.etsOpenDeviceManager)
    }
  }
}
