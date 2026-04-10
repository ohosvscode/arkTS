import type { Arrayable } from '@vueuse/core'
import child_process from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import axios from 'axios'
import hbs from 'handlebars'
import { Autowired, Service } from 'unioc'
import { ExtensionContext, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { ProtocolContext } from '../../context/protocol-context'
import { InitialCallbackEvent } from '../../context/webview-context'
import { WebviewContainer } from '../../context/webview-html-loader'
import { HdcManager } from '../../hdc-manager'
import { HilogController } from '../../hilog'
import { SnapshotPreviewer } from '../../views/snapshot-previewer'
import { ConnectDeviceCommand } from '../commands/connect-device-command'
import { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'
import { TopCommandParser } from '../utils/parse-top'

hbs.registerHelper('equal', (a: number | string, b: number | string) => Number(a) === Number(b) || String(a) === String(b))

@Service
export class HdcServerFunctionImpl extends ProtocolContext<HdcManagerConnectionProtocol.ClientFunction, HdcManagerConnectionProtocol.ServerFunction> implements HdcManagerConnectionProtocol.ServerFunction {
  @Autowired(Translator) protected readonly translator: Translator
  @Autowired protected readonly hdcManager: HdcManager
  @Autowired(ExtensionContext) protected readonly extensionContext: vscode.ExtensionContext
  @Autowired private readonly hilogController: HilogController
  @Autowired private readonly connectDeviceCommand: ConnectDeviceCommand
  @Autowired private readonly topCommandParser: TopCommandParser
  @Autowired private readonly snapshotPreviewer: SnapshotPreviewer

  private webviewContainer: WebviewContainer

  onRpcInitialized(ctx: InitialCallbackEvent<HdcManagerConnectionProtocol.ClientFunction, HdcManagerConnectionProtocol.ServerFunction>): void {
    super.onRpcInitialized(ctx)
    this.webviewContainer = ctx.webviewContainer
    this.extensionContext.subscriptions.push(
      vscode.commands.registerCommand('ets.refreshLayoutsCheckerTool', async () => ctx.connection.onRefreshLayouts()),
      vscode.commands.registerCommand('ets.collapseAllLayoutsCheckerToolTree', async () => ctx.connection.onCollapseAllLayouts()),
      vscode.commands.registerCommand('ets.expandAllLayoutsCheckerToolTree', async () => ctx.connection.onExpandAllLayouts()),
      vscode.commands.registerCommand('ets.switchApplicationViewType', async () => {
        const grid = this.translator.t('hdcManager.application.viewType.grid.title')
        const list = this.translator.t('hdcManager.application.viewType.list.title')
        const applicationViewType = await vscode.window.showQuickPick([
          { label: grid, detail: this.translator.t('hdcManager.application.viewType.grid.description'), iconPath: new vscode.ThemeIcon('layout') },
          { label: list, detail: this.translator.t('hdcManager.application.viewType.list.description'), iconPath: new vscode.ThemeIcon('list-selection') },
        ])
        if (applicationViewType?.label === grid) {
          await ctx.connection.setApplicationViewType('grid')
        }
        else if (applicationViewType?.label === list) {
          await ctx.connection.setApplicationViewType('list')
        }
      }),
    )
  }

  async getHdcPath(): Promise<string | null> {
    return this.hdcManager.getHdcPath()
  }

  async setCurrentConnectKey(connectKey: string | -1): Promise<void> {
    this.hdcManager.setCurrentConnectKey(connectKey)
  }

  async getConnectedDevices(): Promise<string[]> {
    const hdcClient = await this.hdcManager.getHdcClient()
    return await hdcClient?.listTargets() ?? []
  }

  async getApplications(connectKey: string): Promise<HdcManagerConnectionProtocol.ServerFunction.GetApplications.Response> {
    const hdcClient = await this.hdcManager.getHdcClient()
    if (!hdcClient) return HdcManagerConnectionProtocol.ServerFunction.GetApplications.defaultResponse
    const connection = await hdcClient.getTarget(connectKey).shell('bm dump -a')
    const output = (await connection.readAll()).toString()
    const applicationBundleNames = output
      .split('\n')
      .slice(1)
      .map(line => line.trim())
      .filter(Boolean)

    return {
      applications: await Promise.all(
        applicationBundleNames.map(async (bundleName) => {
          const bundleInfo = await hdcClient.getTarget(connectKey)
            .shell(`bm dump -n ${bundleName}`)
            .then(connection => connection.readAll())
            .then(buffer => buffer.toString().split('\n').slice(1).join('\n'))
            .then(output => JSON.parse(output))

          return {
            bundleName,
            versionName: bundleInfo?.versionName,
            installTime: bundleInfo?.installTime,
            mainEntry: bundleInfo?.mainEntry,
            vendor: bundleInfo?.vendor,
            apiTargetVersion: bundleInfo?.apiTargetVersion,
            releaseType: bundleInfo?.releaseType,
            mainAbility: (() => {
              if (!bundleInfo?.hapModuleInfos || !bundleInfo?.hapModuleNames || !bundleInfo?.mainEntry) return undefined
              const mainModuleInfo = bundleInfo?.hapModuleInfos?.[bundleInfo?.hapModuleNames?.indexOf?.(bundleInfo?.mainEntry)]
              return mainModuleInfo?.mainAbility || mainModuleInfo?.abilityInfos?.[0]?.name
            })(),
          } satisfies HdcManagerConnectionProtocol.ServerFunction.GetApplications.Application
        }),
      ),
    }
  }

  async getRemoteApplicationInfo(pkgName: string): Promise<HdcManagerConnectionProtocol.ServerFunction.GetRemoteApplicationInfo.Response> {
    return await axios
      .post('https://web-drcn.hispace.dbankcloud.com/edge/webedge/appinfo', { pkgName })
      .then(res => res.data ?? {})
      .then(res => ({
        ...res,
        icon: res.icon ?? this.webviewContainer.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionContext.extensionUri, 'assets', 'blank-app.png')).toString(),
      }))
      .catch(() => ({}))
  }

  async startAbility(connectKey: string, bundleName: string, abilityName: string): Promise<void> {
    const hdcClient = await this.hdcManager.getHdcClient()
    if (!hdcClient) return
    await hdcClient.getTarget(connectKey).shell(`aa start -a ${abilityName} -b ${bundleName}`)
  }

  setLogLevel(logLevel: Arrayable<'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'>, connectKey: string): Promise<void> {
    return this.hilogController.setLogLevel(logLevel, connectKey)
  }

  openHilog(): Promise<void> {
    return this.hilogController.openHilog()
  }

  async openConnectDeviceDialog(): Promise<void> {
    await this.connectDeviceCommand.onExecuteCommand()
  }

  async disconnectDevice(connectKey: string): Promise<void> {
    const yes = this.translator.t('yes')
    const res = await vscode.window.showInformationMessage(`是否要断开设备${connectKey}连接? 注意: 如果是本地启动的模拟器设备, 断开连接的操作可能是无效的。`, { modal: true }, yes)
    if (res === yes) {
      const hdcPath = await this.getHdcPath()
      if (!hdcPath) return
      const disconnectedMessage = child_process.execSync(`${hdcPath} tconn ${connectKey} -remove`, { encoding: 'utf-8' }).trim()
      console.warn(`${connectKey} disconnected: ${disconnectedMessage}`)
    }
  }

  async getProcesses(connectKey: string): Promise<HdcManagerConnectionProtocol.ServerFunction.GetProcesses.Response> {
    const hdcClient = await this.hdcManager.getHdcClient()
    if (!hdcClient) return HdcManagerConnectionProtocol.ServerFunction.GetProcesses.defaultResponse
    const connection = await hdcClient.getTarget(connectKey).shell('top -b -n 1')
    const output = (await connection.readAll()).toString()
    return this.topCommandParser.parseTopCommand(output)
  }

  async captureScreenAndOpenPreviewer(connectKey: string): Promise<HdcManagerConnectionProtocol.ServerFunction.CaptureScreenAndOpenPreviewer.Response> {
    const name = 'echo_screen.jpeg'
    const p = `/data/local/tmp/${name}`
    const hdcClient = await this.hdcManager.getHdcClient()
    if (!hdcClient) return HdcManagerConnectionProtocol.ServerFunction.CaptureScreenAndOpenPreviewer.defaultResponse
    const target = hdcClient.getTarget(connectKey)
    // We move the .so file to extension's assets folder to avoid the native .so file is not found issue.
    const uiDriver = await target.createUiDriver(
      vscode.Uri.joinPath(this.extensionContext.extensionUri, 'assets', 'uitest_agent_v1.1.0.so').fsPath,
      '1.1.0',
    )
    const [layout] = await Promise.all([
      uiDriver.captureLayout(),
      target.shell(`rm -r ${p} && snapshot_display -i 0 -f ${p}`),
    ])
    const dest = path.resolve(os.tmpdir(), name)
    await target.recvFile(p, dest)
    const imageBase64 = fs.readFileSync(dest, 'base64')
    fs.rmSync(dest)
    await this.snapshotPreviewer.createWebviewPanel({
      onReveal: () => this.snapshotPreviewer.getCurrentConnection()?.onLayoutRefresh?.({
        connectKey,
        imageBase64,
        layout,
      }),
      metadata: {
        connectKey,
        imageBase64,
        layout,
      },
    })
    return layout
  }

  async setCurrentTab(tab: HdcManagerConnectionProtocol.ServerFunction.SetCurrentTab.Tab): Promise<void> {
    this.getConsola().info(`Current HDC manager tab: ${tab}`)
    vscode.commands.executeCommand('setContext', 'ets.hdcManagerTab', tab)
  }
}
