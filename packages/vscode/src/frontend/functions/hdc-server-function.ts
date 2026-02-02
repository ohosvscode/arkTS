import type { BirpcReturn } from 'birpc'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import axios from 'axios'
import hbs from 'handlebars'
import { Autowired, Service } from 'unioc'
import { ExtensionContext, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { ProtocolContext } from '../../context/protocol-context'
import { WebviewPanelContext } from '../../context/webview-panel-context'
import { HdcManager } from '../../hdc-manager'
import { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'

hbs.registerHelper('equal', (a: number | string, b: number | string) => Number(a) === Number(b) || String(a) === String(b))

@Service
export class HdcServerFunctionImpl extends ProtocolContext<HdcManagerConnectionProtocol.ClientFunction, HdcManagerConnectionProtocol.ServerFunction> implements HdcManagerConnectionProtocol.ServerFunction {
  @Autowired(Translator)
  protected readonly translator: Translator

  @Autowired
  protected readonly hdcManager: HdcManager

  @Autowired(ExtensionContext)
  protected readonly extensionContext: vscode.ExtensionContext

  onRpcInitialized(connection: BirpcReturn<HdcManagerConnectionProtocol.ClientFunction, HdcManagerConnectionProtocol.ServerFunction>, context: WebviewPanelContext<HdcManagerConnectionProtocol.ClientFunction, HdcManagerConnectionProtocol.ServerFunction>): void {
    super.onRpcInitialized(connection, context)
    this.extensionContext.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (!e.affectsConfiguration('ets.localImagePath')) return
        connection.onDidChangeLocalImagePath(
          await this.getLocalImagePath(),
          await this.isValidLocalImagePath(await this.getLocalImagePath()),
        )
      }),
    )
  }

  async getHdcPath(): Promise<string | null> {
    return this.hdcManager.getHdcPath()
  }

  private getDefaultLocalImagePath(): string {
    switch (process.platform) {
      case 'win32':
        return process.env.APPDATA ? path.resolve(process.env.APPDATA, 'Local', 'Huawei', 'Sdk') : path.resolve(os.homedir(), 'AppData', 'Local', 'Huawei', 'Sdk')
      case 'darwin':
        return path.resolve(os.homedir(), 'Library', 'Huawei', 'Sdk')
      // Although linux and other platforms are not supported, we still return a default path for them
      default:
        return path.resolve(os.homedir(), '.local', 'share', 'Huawei', 'Sdk')
    }
  }

  async getLocalImagePath(): Promise<string> {
    return (await vscode.workspace.getConfiguration('ets').get('localImagePath')) || this.getDefaultLocalImagePath()
  }

  async isValidLocalImagePath(path: string): Promise<HdcManagerConnectionProtocol.ServerFunction.isValidLocalImagePath.Response> {
    if (!fs.existsSync(path)) return 'not-exists'
    if (!fs.statSync(path).isDirectory()) return 'not-folder'
    try {
      fs.accessSync(path, fs.constants.W_OK)
    }
    catch {
      return 'invalid-permission'
    }
    return true
  }

  async getConnectedDevices(): Promise<HdcManagerConnectionProtocol.ServerFunction.GetConnectedDevices.Response> {
    const devices: HdcManagerConnectionProtocol.ServerFunction.GetConnectedDevices.Device[] = []

    return { devices }
  }

  async copyTextToClipboard(text: string, showMessage = true): Promise<void> {
    await vscode.env.clipboard.writeText(text)
    if (showMessage) vscode.window.showInformationMessage(this.translator.t('copySuccess'))
  }

  async requestRemoteImageList(request: HdcManagerConnectionProtocol.ServerFunction.RequestRemoteImageList.Request): Promise<HdcManagerConnectionProtocol.ServerFunction.RequestRemoteImageList.Response> {
    const resolvedRequest = HdcManagerConnectionProtocol.ServerFunction.RequestRemoteImageList.Request.resolve(request)
    const response = await axios.post('https://devecostudio-drcn.deveco.dbankcloud.com/sdkmanager/v8/hos/getSdkList', {
      osArch: resolvedRequest.arch,
      osType: resolvedRequest.os,
      supportVersion: '6.0-hos-single-8',
    })
    if (!Array.isArray(response.data)) return { images: [] }

    return {
      images: response.data.map((item) => {
        const [,systemNameWithVersion, deviceTypeWithAndOptionalAllAndArch] = (item?.path as string).split(',')
        const [deviceType] = deviceTypeWithAndOptionalAllAndArch.split('_')
        const [systemName, targetVersion] = systemNameWithVersion.split('-')

        return {
          id: item?.path,
          version: item?.version,
          apiVersion: `API${item?.apiVersion}`,
          numericApiVersion: Number(item?.apiVersion),
          targetVersion,
          deviceType,
          systemName,
        }
      }),
    }
  }

  async requestRemoteImageDownload(image: HdcManagerConnectionProtocol.ServerFunction.RequestRemoteImageList.Image, request?: HdcManagerConnectionProtocol.ServerFunction.RequestRemoteImageList.Request): Promise<void> {
    const resolvedRequest = HdcManagerConnectionProtocol.ServerFunction.RequestRemoteImageList.Request.resolve(request)
    const response = await axios.post('https://devecostudio-drcn.deveco.dbankcloud.com/sdkmanager/v7/hos/download', {
      osArch: resolvedRequest.arch,
      osType: resolvedRequest.os,
      path: {
        path: image.id,
        version: image.version,
      },
      // I don't know what this is but it's required when downloading some images
      // e.g. path: system-image,HarmonyOS-5.0.1,phone_arm, version: 5.0.0.112 (API13) must be provided
      // It seem like a UUID and not like a real IMEI
      imei: 'd490a470-8719-4baf-9cc4-9c78d40d',
    })
    vscode.window.showInformationMessage(response.data?.url ?? `Fetch download URL failed. ${JSON.stringify(response.data)}`)
  }
}
