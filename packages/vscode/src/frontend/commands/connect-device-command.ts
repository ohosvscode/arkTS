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
      vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: connecting }, async () => {
        await timeout(async () => {
          const output = child_process.execFileSync(hdcPath, ['tconn', ip], { encoding: 'utf-8' }).trim()
          if (output === 'Connect OK') vscode.window.showInformationMessage(this.translator.t('hdcManager.connectDeviceDialog.connectByIP.success', ip))
          else vscode.window.showErrorMessage(this.translator.t('hdcManager.connectDeviceDialog.connectByIP.error', ip, output))
        }, 10000, new Error('Connect timeout'))
      })
    }
    else if (dialog.label === openDeviceManagerTitle) {
      vscode.commands.executeCommand(commands.etsOpenDeviceManager)
    }
  }
}
