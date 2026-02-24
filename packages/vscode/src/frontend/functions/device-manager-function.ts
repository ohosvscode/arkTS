import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createScreen, createScreenPreset, Device, FullDeployedImageOptions, LocalImage, ProductPreset, RemoteImage, RequestUrlError, Screen, SnakecaseDeviceType, version } from '@arkts/image-manager'
import { BirpcReturn } from 'birpc'
import { Autowired, Service } from 'unioc'
import { ExtensionContext, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { FileSystemContext } from '../../context/file-system-context'
import { ProtocolContext } from '../../context/protocol-context'
import { WebviewContext } from '../../context/webview-context'
import { HdcManager } from '../../hdc-manager'
import { DeviceManagerProtocol } from '../interfaces/device-manager-protocol'

@Service
export class DeviceManagerFunctionImpl extends ProtocolContext<DeviceManagerProtocol.ClientFunction, DeviceManagerProtocol.ServerFunction> implements DeviceManagerProtocol.ServerFunction {
  @Autowired(Translator) protected readonly translator: Translator
  @Autowired(ExtensionContext) protected readonly extensionContext: ExtensionContext
  @Autowired protected readonly hdcManager: HdcManager
  @Autowired protected readonly fsx: FileSystemContext

  private connection: BirpcReturn<DeviceManagerProtocol.ClientFunction, DeviceManagerProtocol.ServerFunction>

  onRpcInitialized(connection: BirpcReturn<DeviceManagerProtocol.ClientFunction, DeviceManagerProtocol.ServerFunction>, context: WebviewContext<DeviceManagerProtocol.ClientFunction, DeviceManagerProtocol.ServerFunction>): void {
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
    this.connection = connection
  }

  private async findDeviceByName(name: string, image: LocalImage): Promise<Device | undefined> {
    const devices = await image.getDevices()
    for (const device of devices) {
      const deviceList = device.buildList()
      if (deviceList.name === name) return device
    }
    return undefined
  }

  private async findDeviceByUuid(uuid: string, image: LocalImage): Promise<Device | undefined> {
    const devices = await image.getDevices()
    for (const device of devices) {
      const deviceList = device.buildList()
      if (deviceList.uuid === uuid) return device
    }
  }

  private getDefaultLocalImagePath(): vscode.Uri {
    switch (process.platform) {
      case 'win32':
        return process.env.APPDATA ? vscode.Uri.joinPath(vscode.Uri.file(process.env.APPDATA), 'Local', 'Huawei', 'Sdk') : vscode.Uri.joinPath(vscode.Uri.file(os.homedir()), 'AppData', 'Local', 'Huawei', 'Sdk')
      case 'darwin':
        return vscode.Uri.joinPath(vscode.Uri.file(os.homedir()), 'Library', 'Huawei', 'Sdk')
      // Although linux and other platforms are not supported, we still return a default path for them
      default:
        return vscode.Uri.joinPath(vscode.Uri.file(os.homedir()), '.local', 'share', 'Huawei', 'Sdk')
    }
  }

  async getLocalImagePath(): Promise<string> {
    return (await vscode.workspace.getConfiguration('ets').get('localImagePath')) || this.getDefaultLocalImagePath().fsPath
  }

  async isValidLocalImagePath(path: string): Promise<DeviceManagerProtocol.ServerFunction.isValidLocalImagePath.Response> {
    if (!await this.fsx.isExists(vscode.Uri.file(path))) return 'not-exists'
    if (!this.fsx.isDirectory(vscode.Uri.file(path))) return 'not-folder'
    return true
  }

  async requestRemoteImageList(): Promise<DeviceManagerProtocol.ServerFunction.RequestRemoteImageList.Response> {
    const imageManager = await this.hdcManager.createImageManager()
    const images = await imageManager.getImages()

    return {
      images: images.map(image => image.toJSON()),
    }
  }

  async getLocalImageProductConfig(imagePath: string): Promise<DeviceManagerProtocol.ServerFunction.GetLocalImageProductConfig.Response> {
    const imageManager = await this.hdcManager.createImageManager()
    const images = await imageManager.getImages()
    const image = images.find(image => image.getPath() === imagePath)
    if (!image) return null
    if (image.imageType !== 'local') return null
    const deviceType = await image.getPascalCaseDeviceType()
    if (!deviceType) return null
    const productConfig = await image.getProductConfig()

    return {
      productConfig,
      deviceType,
      snakecaseDeviceType: image.getSnakecaseDeviceType() as SnakecaseDeviceType,
    }
  }

  async getLocalImageByPath(imagePath: string): Promise<LocalImage.Stringifiable | null> {
    const imageManager = await this.hdcManager.createImageManager()
    const images = await imageManager.getImages()
    const image = images.find(image => image.getPath() === imagePath)
    if (!image) return null
    if (image.imageType !== 'local') return null
    return image.toJSON()
  }

  async deployLocalImage(options: Omit<Device.Options, 'screen'>, screen: Screen.Options | ProductPreset.Stringifiable, imagePath: string): Promise<boolean> {
    try {
      const imageManager = await this.hdcManager.createImageManager()
      const images = await imageManager.getImages()
      const image = images.find(image => image.getPath() === imagePath)
      if (!image) return false
      if (image.imageType !== 'local') return false
      const pascalCaseDeviceType = await image.getPascalCaseDeviceType()
      if (!pascalCaseDeviceType) return false

      await image.createDevice({
        ...options,
        screen: 'density' in screen
          ? createScreen(screen)
          : createScreenPreset({
              image,
              pascalCaseDeviceType,
              productConfig: screen.product,
            }),
      }).deploy()
      return true
    }
    catch (error) {
      vscode.window.showErrorMessage(`设备部署失败: ${error instanceof Error ? error.message : String(error)}`)
      this.getConsola().error('设备部署失败: ', error instanceof Error ? error.message : String(error))
      console.error(error)
      return false
    }
  }

  async deleteDevice(name: string, imagePath: string): Promise<void> {
    const yes = this.translator.t('yes')
    const res = await vscode.window.showInformationMessage('是否要删除该设备？', { modal: true }, yes)
    if (res !== yes) return
    const imageManager = await this.hdcManager.createImageManager()
    const images = await imageManager.getImages()
    const image = images.find(image => image.getFsPath() === path.resolve(imageManager.getOptions().imageBasePath, imagePath))
    if (!image) {
      vscode.window.showErrorMessage('镜像未找到')
      return
    }
    if (image.imageType !== 'local') return
    const device = await this.findDeviceByName(name, image)
    if (!device) {
      vscode.window.showErrorMessage('设备未找到')
      return
    }
    await device.delete()
    vscode.window.showInformationMessage('设备删除成功')
  }

  async getImageManagerVersion(): Promise<string> {
    return version
  }

  async isCompatible(): Promise<boolean> {
    const imageManager = await this.hdcManager.createImageManager()
    return imageManager.isCompatible()
  }

  private currentDownloadTask: Thenable<void> | undefined

  async requestRemoteImageDownload(serializedImage: RemoteImage.Stringifiable): Promise<void> {
    if (this.currentDownloadTask) {
      vscode.window.showInformationMessage(this.translator.t('hdcManager.imageManager.downloading.alreadyInProgress'))
      return
    }

    const imageManager = await this.hdcManager.createImageManager()
    const images = await imageManager.getImages()
    const image = images.find(image => image.getPath() === serializedImage.path)
    if (!image) return
    if (image.imageType === 'local') return
    const downloader = await image.createDownloader()
    if (downloader instanceof RequestUrlError) return

    const version = `${image.getTargetOS()} ${image.getTargetVersion()}(API${image.getApiVersion()})`
    this.currentDownloadTask = vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: this.translator.t('hdcManager.imageManager.downloading.title', version),
      cancellable: true,
    }, async (progress, token) => {
      if (token.isCancellationRequested) return

      const abortController = new AbortController()
      token.onCancellationRequested(() => {
        abortController.abort()
        vscode.window.showInformationMessage(this.translator.t('hdcManager.imageManager.downloading.cancelled', version))
      })

      downloader.on('download-progress', e => (
        progress.report({
          increment: e.increment,
          message: this.translator.t(
            'hdcManager.imageManager.downloading.progress',
            e.progress ? (e.progress * 100).toFixed(2) : 0,
            e.network.toFixed(2),
            e.unit,
            e.estimated ? e.estimated.toFixed() : 0,
          ),
        })
      ))

      await downloader.startDownload(abortController.signal)
    }).then(() =>
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: this.translator.t('hdcManager.imageManager.extracting.title', version),
        cancellable: true,
      }, async (progress, token) => {
        if (token.isCancellationRequested) return
        const abortController = new AbortController()
        token.onCancellationRequested(() => {
          abortController.abort()
          vscode.window.showInformationMessage(this.translator.t('hdcManager.imageManager.extracting.cancelled', version))
        })

        downloader.on('extract-progress', e => (
          progress.report({
            increment: e.delta,
            message: this.translator.t(
              'hdcManager.imageManager.extracting.progress',
              e.percentage ? e.percentage.toFixed(2) : 0,
              e.eta ? e.eta.toFixed() : 0,
            ),
          })
        ))

        await downloader.extract(abortController.signal)
      }),
    ).then(
      () => {
        vscode.window.showInformationMessage(this.translator.t('hdcManager.imageManager.downloading.success', version))
        this.connection.onDidRefresh()
        this.currentDownloadTask = undefined
      },
      (err) => {
        vscode.window.showErrorMessage(this.translator.t('hdcManager.imageManager.downloading.error', err instanceof Error ? err.message : String(err)))
        this.connection.onDidRefresh()
        this.currentDownloadTask = undefined
      },
    )
  }

  async getLocalDevices(): Promise<DeviceManagerProtocol.ServerFunction.GetLocalDevices.Response> {
    const imageManager = await this.hdcManager.createImageManager()
    const images = await imageManager.getImages()
    const devices = await Promise.all(images.filter(image => image.imageType === 'local').map(image => image.getDevices()))
      .then(devices => devices.flat())
      .then(devices => devices.map(device => device.buildList()))

    return { devices }
  }

  async deleteLocalImage(serializedLocalImage: LocalImage.Stringifiable): Promise<void> {
    const imageManager = await this.hdcManager.createImageManager()
    const images = await imageManager.getImages()
    const image = images.find(image => image.getPath() === serializedLocalImage.path)
    if (!image) return
    if (image.imageType !== 'local') return

    const version = `${image.getTargetOS()} ${image.getTargetVersion()}(API${image.getApiVersion()}) (${image.getDeviceType()})`
    const yes = this.translator.t('yes')
    const result = await vscode.window.showInformationMessage(
      this.translator.t('hdcManager.imageManager.delete.title', version),
      { modal: true },
      yes,
    )
    if (result === yes) {
      await image.delete()
      vscode.window.showInformationMessage(this.translator.t('hdcManager.imageManager.delete.success', version))
    }
    this.connection.onDidRefresh()
  }

  async startDevice(serializedDevice: FullDeployedImageOptions): Promise<void> {
    try {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '设备启动中...',
      }, async () => {
        const imageManager = await this.hdcManager.createImageManager()
        const images = await imageManager.getImages()
        const image = images.find(image => image.getFsPath() === path.resolve(imageManager.getOptions().imageBasePath, serializedDevice.imageDir))
        if (!image || image.imageType !== 'local') {
          vscode.window.showErrorMessage('镜像未找到')
          return
        }
        const device = await this.findDeviceByUuid(serializedDevice.uuid, image)
        if (!device) {
          vscode.window.showErrorMessage('设备未找到')
          return
        }
        const command = await image.buildStartCommand(device)
        this.getConsola().info('Starting device, command: ', command)
        const child_process = await image.start(device)
        this.extensionContext.subscriptions.push(
          new vscode.Disposable(() => {
            if (child_process.exitCode !== null) image.stop(device)
          }),
        )
        this.getConsola().success('Device start command executed successfully.')
      })
    }
    catch (error) {
      vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error))
      console.error('设备启动失败')
      console.error(error)
    }
  }
}
