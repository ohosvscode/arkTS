import type { BirpcReturn } from 'birpc'
import { Device, DeviceTypeConverter, EmulatorFile, Image, LocalImage, RemoteImage, version } from '@arkts/image-manager'
import { Autowired, Service } from 'unioc'
import { ExtensionContext, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { FileSystemContext } from '../../context/file-system-context'
import { ProtocolContext } from '../../context/protocol-context'
import { WebviewContext } from '../../context/webview-context'
import { ConfigKey } from '../../generated/meta'
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
        if (e.affectsConfiguration('ets.localImagePath' satisfies ConfigKey)) {
          connection.onDidChangeLocalImagePath(
            await this.getLocalImagePath(),
            await this.isValidLocalImagePath(await this.getLocalImagePath()),
          )
        }
        else if (e.affectsConfiguration('ets.deployedEmulatorPath' satisfies ConfigKey)) {
          connection.onDidChangeDeployedEmulatorPath(
            await this.getDeployedEmulatorPath(),
            await this.isValidDeployedEmulatorPath(await this.getDeployedEmulatorPath()),
          )
        }
      }),
    )
    this.connection = connection
  }

  async getConfigByLocalImage(imagePath: Image.RelativePath, deviceType: EmulatorFile.DeviceType): Promise<DeviceManagerProtocol.ServerFunction.GetConfigByLocalImage.Response> {
    const imageManager = await this.hdcManager.createImageManager()
    const productConfigFile = await imageManager.readProductConfigFile()
    const emulatorFile = await imageManager.readEmulatorFile()
    const images = await imageManager.getLocalImages()
    const image = images.find(image => image.getRelativePath() === imagePath)
    if (!image) return { productConfig: [] }

    const productConfig = productConfigFile.findProductConfigItems({
      deviceType: DeviceTypeConverter.snakecaseToCamelcase(deviceType),
    }).map(productConfigItem => productConfigItem.toJSON())
    const emulatorConfig = emulatorFile.findDeviceItem({
      deviceType,
      apiVersion: image.getApiVersion(),
    })?.getContent()

    return {
      productConfig,
      emulatorConfig,
      localImage: image.toJSON(),
    }
  }

  async getEmulatorConfig(): Promise<DeviceManagerProtocol.ServerFunction.GetEmulatorConfig.Response[]> {
    const imageManager = await this.hdcManager.createImageManager()
    const emulatorFile = await imageManager.readEmulatorFile()
    const remoteImages = await imageManager.getRemoteImages()
    if (!Array.isArray(remoteImages)) return []

    return await Promise.all(
      emulatorFile.getDeviceItems().map(
        async (item) => {
          const remoteImage = emulatorFile.findRemoteImageByDeviceItem(item, remoteImages)
          if (!remoteImage) return null
          return {
            content: item.getContent(),
            remoteImage: remoteImage.toJSON(),
            localImage: await remoteImage.getLocalImage().then(image => image?.toJSON()),
          }
        },
      ),
    ).then(items => items.filter(item => item !== null))
  }

  async getLocalImagePath(): Promise<string> {
    const imageManager = await this.hdcManager.createImageManager()
    return imageManager.getOptions().imageBasePath.fsPath
  }

  async isValidLocalImagePath(path: string): Promise<DeviceManagerProtocol.ServerFunction.isValidLocalImagePath.Response> {
    if (!await this.fsx.isExists(vscode.Uri.file(path))) return 'not-exists'
    if (!await this.fsx.isDirectory(vscode.Uri.file(path))) return 'not-folder'
    return true
  }

  async getDeployedEmulatorPath(): Promise<string> {
    const imageManager = await this.hdcManager.createImageManager()
    return imageManager.getOptions().deployedPath.fsPath
  }

  async isValidDeployedEmulatorPath(path: string): Promise<DeviceManagerProtocol.ServerFunction.isValidDeployedEmulatorPath.Response> {
    if (!await this.fsx.isExists(vscode.Uri.file(path))) return 'not-exists'
    if (!await this.fsx.isDirectory(vscode.Uri.file(path))) return 'not-folder'
    return true
  }

  async requestRemoteImageList(): Promise<DeviceManagerProtocol.ServerFunction.RequestRemoteImageList.Response> {
    const imageManager = await this.hdcManager.createImageManager()
    const images = await imageManager.getRemoteImages()
    if (!Array.isArray(images)) return { images: [] }

    return { images: images.map(image => image.toJSON()) }
  }

  async getLocalImageByPath(imagePath: Image.RelativePath): Promise<LocalImage.Serializable | null> {
    const imageManager = await this.hdcManager.createImageManager()
    const images = await imageManager.getLocalImages()
    const image = images.find(image => image.getRelativePath() === imagePath)
    if (!image) return null
    if (image.imageType !== 'local') return null
    return image.toJSON()
  }

  async deployLocalImage(imagePath: string, options: DeviceManagerProtocol.ServerFunction.DeployLocalImage.SerializableCreateDeviceOptions): Promise<boolean> {
    try {
      const imageManager = await this.hdcManager.createImageManager()
      const images = await imageManager.getLocalImages()
      const image = images.find(image => image.getRelativePath() === imagePath)
      if (!image) return false
      this.getConsola().info(`Creating device ${options.name} with options: ${JSON.stringify(options)}`)
      const emulatorFile = await imageManager.readEmulatorFile()
      const emulatorDeviceItem = emulatorFile.findDeviceItem({
        deviceType: options.screen.emulatorDeviceItem.deviceType,
        apiVersion: options.screen.emulatorDeviceItem.api,
      })
      const productConfigFile = await imageManager.readProductConfigFile()
      const productConfigItem = productConfigFile.findProductConfigItem({
        deviceType: options.screen.productConfigItem.deviceType,
        name: options.screen.productConfigItem.content.name,
      })
      if (!productConfigItem) throw new Error('Product config item not found.')
      if (!emulatorDeviceItem) throw new Error('Emulator device item not found.')
      const device = await image.createDevice({
        ...options,
        screen: {
          emulatorDeviceItem,
          productConfigItem,
          customizeScreen: options.screen.customizeScreen,
          customizeFoldableScreen: options.screen.customizeFoldableScreen,
        } as any,
      })
      console.warn(device.getScreen().getEmulatorDeviceItem())
      this.getConsola().info(`Device ${options.name} created and deployed successfully.`)
      return true
    }
    catch (error) {
      vscode.window.showErrorMessage(`Device ${options.name} deployment failed: ${error instanceof Error ? error.message : String(error)}`)
      this.getConsola().error(`Device ${options.name} deployment failed: ${error instanceof Error ? error.message : String(error)}`)
      if (error instanceof Error) this.getConsola().error(error.stack)
      console.error(error)
      return false
    }
  }

  async deleteDevice(name: string): Promise<void> {
    const yes = this.translator.t('yes')
    const res = await vscode.window.showInformationMessage('是否要删除该设备？', { modal: true }, yes)
    if (res !== yes) return
    const imageManager = await this.hdcManager.createImageManager()
    const devices = await imageManager.getDeployedDevices()
    const device = devices.find(device => device.getListsFileItem().getContent().name === name)
    if (!device) return
    await device.delete()
    vscode.window.showInformationMessage('设备删除成功')
  }

  async getImageManagerVersion(): Promise<string> {
    return version
  }

  async isCompatible(): Promise<boolean> {
    try {
      const imageManager = await this.hdcManager.createImageManager()
      return imageManager.isCompatible()
    }
    catch (error) {
      console.error(error)
      return false
    }
  }

  private currentDownloadTask: Thenable<void> | undefined

  async requestRemoteImageDownload(serializedImage: RemoteImage.Serializable): Promise<void> {
    if (this.currentDownloadTask) {
      vscode.window.showInformationMessage(this.translator.t('hdcManager.imageManager.downloading.alreadyInProgress'))
      return
    }

    const imageManager = await this.hdcManager.createImageManager()
    const images = await imageManager.getRemoteImages()
    if (!Array.isArray(images)) return
    const image = images.find(image => image.getRelativePath() === serializedImage.relativePath)
    if (!image) return
    const downloader = await image.createDownloader()
    const sdk = image.getRemoteImageSDK()
    const version = `${sdk.path?.split(',')?.[1]?.split('-')[0]} ${sdk.version}(API${image.getApiVersion()})`
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
        this.getConsola().info(`Downloading ${version} cancelled.`)
        this.currentDownloadTask = undefined
      })

      downloader.onDownloadProgress((e) => {
        progress.report({
          increment: e.increment,
          message: this.translator.t(
            'hdcManager.imageManager.downloading.progress',
            e.progress ? e.progress.toFixed(2) : 0,
            e.network.toFixed(2),
            e.unit,
          ),
        })
        this.getConsola().info(`Downloading ${version} progress: ${e.progress ? e.progress.toFixed(2) : 0}, network: ${e.network.toFixed(2)}, unit: ${e.unit}`)
      })

      this.getConsola().info(`Downloading ${version} started.`)
      await downloader.startDownload()
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
          this.getConsola().info(`Extracting ${version} cancelled.`)
          this.currentDownloadTask = undefined
        })

        downloader.onExtractProgress((e) => {
          progress.report({
            increment: e.increment,
            message: this.translator.t('hdcManager.imageManager.extracting.progress', e.progress ? e.progress.toFixed(2) : 0),
          })
          this.getConsola().info(`Extracting ${version} progress: ${e.progress ? e.progress.toFixed(2) : 0}`)
        })

        this.getConsola().info(`Extracting ${version} started.`)
        await downloader.extract()
      }),
    ).then(
      () => {
        vscode.window.showInformationMessage(this.translator.t('hdcManager.imageManager.downloading.success', version))
        this.connection.onDidRefresh()
        this.currentDownloadTask = undefined
      },
      (err) => {
        vscode.window.showErrorMessage(this.translator.t('hdcManager.imageManager.downloading.error', err instanceof Error ? err.message : String(err)))
        this.getConsola().error(this.translator.t('hdcManager.imageManager.downloading.error', err instanceof Error ? err.message : String(err)))
        this.getConsola().error(err instanceof Error ? err.stack : String(err))
        this.connection.onDidRefresh()
        this.currentDownloadTask = undefined
      },
    )
  }

  async getLocalDevices(): Promise<DeviceManagerProtocol.ServerFunction.GetLocalDevices.Response[]> {
    const imageManager = await this.hdcManager.createImageManager()
    const devices = await imageManager.getDeployedDevices()

    return await Promise.all(
      devices.map(
        async device => ({
          device: device.toJSON(),
          snapshot: await device.getSnapshot().then(
            snapshot => snapshot,
            () => null,
          ),
        }),
      ),
    )
  }

  async deleteLocalImage(imagePath: Image.RelativePath): Promise<void> {
    const imageManager = await this.hdcManager.createImageManager()
    const images = await imageManager.getLocalImages()
    const image = images.find(image => image.getRelativePath() === imagePath)
    if (!image) return
    if (image.imageType !== 'local') return

    const sdk = image.getSdkPkgFile()
    const version = `${sdk.data?.path?.split(',')?.[1]?.split('-')[0]} ${sdk.data?.version}(API${image.getApiVersion()})`
    const yes = this.translator.t('yes')
    const result = await vscode.window.showInformationMessage(
      this.translator.t('hdcManager.imageManager.delete.title', version),
      { modal: true },
      yes,
    )
    if (result === yes) {
      // await image.delete()
      vscode.window.showInformationMessage(this.translator.t('hdcManager.imageManager.delete.success', version))
    }
    this.connection.onDidRefresh()
  }

  async startDevice(serializedDevice: Device.Serializable): Promise<void> {
    try {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '设备启动中...',
      }, async () => {
        const imageManager = await this.hdcManager.createImageManager()
        const devices = await imageManager.getDeployedDevices()
        const device = devices.find(device => device.getListsFileItem().getContent().uuid === serializedDevice.listsFileItem.content.uuid)
        if (!device) {
          vscode.window.showErrorMessage('设备未找到')
          return
        }
        this.getConsola().info('Starting device, command: ', device.getStartCommand())
        const child_process = await device.start()
        this.extensionContext.subscriptions.push(
          new vscode.Disposable(() => {
            if (child_process.exitCode === null) device.stop()
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
