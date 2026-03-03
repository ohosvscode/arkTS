import type { CustomizeFoldableScreen, CustomizeScreen, Device, EmulatorFile, Image, LocalImage, ProductConfigItem, RemoteImage, ScreenPreset } from '@arkts/image-manager'
import type { ProtocolContext } from '../../context/protocol-context'
import type { WebviewContext } from '../../context/webview-context'

export namespace DeviceManagerProtocol {
  export interface ClientFunction extends WebviewContext.ClientFunction {
    /**
     * Called when the local image path changes.
     */
    onDidChangeLocalImagePath(path: string, isValid: ServerFunction.isValidLocalImagePath.Response): void
    /**
     * Called when the deployed emulator path changes.
     */
    onDidChangeDeployedEmulatorPath(path: string, isValid: DeviceManagerProtocol.ServerFunction.isValidDeployedEmulatorPath.Response): void
    /**
     * Called when the webview panel is refreshed.
     */
    onDidRefresh(): void
  }

  export interface ServerFunction extends ProtocolContext<ClientFunction, ServerFunction> {
    /**
     * Get the path of the local image folder.
     */
    getLocalImagePath(): Promise<string>
    /**
     * Get the config of the local image.
     */
    getConfigByLocalImage(imagePath: Image.RelativePath, deviceType: EmulatorFile.DeviceType): Promise<ServerFunction.GetConfigByLocalImage.Response>
    /**
     * Get the emulator config.
     */
    getEmulatorConfig(): Promise<ServerFunction.GetEmulatorConfig.Response[]>
    /**
     * Check if the given path is a valid local image folder.
     */
    isValidLocalImagePath(path: string): Promise<DeviceManagerProtocol.ServerFunction.isValidLocalImagePath.Response>
    /**
     * Get the path of the deployed emulator folder.
     */
    getDeployedEmulatorPath(): Promise<string>
    /**
     * Check if the given path is a valid deployed emulator folder.
     */
    isValidDeployedEmulatorPath(path: string): Promise<DeviceManagerProtocol.ServerFunction.isValidDeployedEmulatorPath.Response>
    /**
     * Check if the current emulator is compatible with the @arkts/image-manager.
     */
    isCompatible(): Promise<boolean>
    /**
     * Request the list of remote images by operating system and architecture.
     *
     * @returns The list of remote images by operating system and architecture.
     */
    requestRemoteImageList(): Promise<DeviceManagerProtocol.ServerFunction.RequestRemoteImageList.Response>
    /**
     * Get the local image by path.
     *
     * @param imagePath The path of the local image to get.
     * @returns The local image.
     */
    getLocalImageByPath(imagePath: Image.RelativePath): Promise<LocalImage.Serializable | null>
    /**
     * Deploy the local image.
     *
     * @param imagePath The path of the local image to deploy.
     */
    deployLocalImage(imagePath: string, options: ServerFunction.DeployLocalImage.SerializableCreateDeviceOptions): Promise<boolean>
    /**
     * Start the device.
     *
     * @param device The device to start.
     */
    startDevice(device: Device.Serializable): Promise<void>
    /**
     * Delete the device.
     *
     * @param name The name of the device to delete.
     */
    deleteDevice(name: string): Promise<void>
    /**
     * Get the list of local devices.
     */
    getLocalDevices(): Promise<DeviceManagerProtocol.ServerFunction.GetLocalDevices.Response[]>
    /**
     * Delete the local image.
     *
     * @param imagePath The path of the local image to delete.
     */
    deleteLocalImage(imagePath: Image.RelativePath): Promise<void>
    /**
     * Download the remote image.
     *
     * @param image The remote image to download.
     */
    requestRemoteImageDownload(image: RemoteImage.Serializable): Promise<void>
    /**
     * Get the version of the image manager.
     */
    getImageManagerVersion(): Promise<string>
  }

  export namespace ServerFunction {
    export namespace isValidLocalImagePath {
      export type Response = 'not-folder' | 'not-exists' | 'invalid-permission' | true
    }

    export namespace isValidDeployedEmulatorPath {
      export type Response = 'not-folder' | 'not-exists' | 'invalid-permission' | true
    }

    export namespace GetLocalDevices {
      export interface Response {
        /**
         * The local device.
         */
        device: Device.Serializable
        /**
         * The snapshot base64 of the local device.
         */
        snapshot: string | null
      }
    }
    export namespace GetLocalImageProductConfig {
      export type Response = {
        productConfig: ProductConfigItem[]
      } | null
    }

    export namespace GetEmulatorConfig {
      export interface Response {
        /**
         * The content of the emulator config.
         */
        content: EmulatorFile.ItemContent
        /**
         * The remote image of the emulator config.
         */
        remoteImage: RemoteImage.Serializable
        /**
         * The local image of the emulator config.
         */
        localImage: LocalImage.Serializable | undefined
      }
    }

    export namespace GetConfigByLocalImage {
      export interface Response {
        productConfig: ProductConfigItem.Serializable[]
        localImage?: LocalImage.Serializable
        emulatorConfig?: EmulatorFile.ItemContent
      }
    }

    export namespace RequestRemoteImageList {
      export interface Response {
        /**
         * The list of remote images.
         */
        images: RemoteImage.Serializable[]
      }
    }

    export namespace DeployLocalImage {
      export type SerializableCreateDeviceOptions = Omit<LocalImage.CreateDeviceOptions, 'screen'> & {
        readonly screen: Omit<ScreenPreset.Options, 'productConfigItem' | 'emulatorDeviceItem'> & {
          readonly productConfigItem: ProductConfigItem.Serializable
          readonly emulatorDeviceItem: EmulatorFile.ItemContent
          readonly customizeScreen?: CustomizeScreen.Options
          readonly customizeFoldableScreen?: CustomizeFoldableScreen.Options
        }
      }
    }
  }
}
