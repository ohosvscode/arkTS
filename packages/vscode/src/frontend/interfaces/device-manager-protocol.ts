import type { Device, FullDeployedImageOptions, LocalImage, PascalCaseDeviceType, ProductConfigItem, ProductPreset, RemoteImage, Screen, SnakecaseDeviceType } from '@arkts/image-manager'
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
     * Get the product config of the local image.
     *
     * @param imagePath The path of the local image to get the product config.
     * @returns The product config of the local image.
     */
    getLocalImageProductConfig(imagePath: string): Promise<DeviceManagerProtocol.ServerFunction.GetLocalImageProductConfig.Response>
    /**
     * Get the local image by path.
     *
     * @param imagePath The path of the local image to get.
     * @returns The local image.
     */
    getLocalImageByPath(imagePath: string): Promise<LocalImage.Stringifiable | null>
    /**
     * Deploy the local image.
     *
     * @param options The options of the device to deploy.
     * @param screen The screen of the device to deploy.
     * @param imagePath The path of the local image to deploy.
     */
    deployLocalImage(options: Omit<Device.Options, 'screen'>, screen: Screen.Stringifiable | ProductPreset.Stringifiable, imagePath: string): Promise<boolean>
    /**
     * Start the device.
     *
     * @param device The device to start.
     */
    startDevice(device: FullDeployedImageOptions): Promise<void>
    /**
     * Delete the device.
     *
     * @param name The name of the device to delete.
     * @param imagePath The path of the image to delete the device.
     */
    deleteDevice(name: string, imagePath: string): Promise<void>
    /**
     * Get the list of local devices.
     */
    getLocalDevices(): Promise<DeviceManagerProtocol.ServerFunction.GetLocalDevices.Response>
    /**
     * Delete the local image.
     *
     * @param serializedLocalImage The serialized local image to delete.
     */
    deleteLocalImage(serializedLocalImage: LocalImage.Stringifiable): Promise<void>
    /**
     * Download the remote image.
     *
     * @param image The remote image to download.
     */
    requestRemoteImageDownload(image: RemoteImage.Stringifiable): Promise<void>
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
         * The list of local devices.
         */
        devices: FullDeployedImageOptions[]
      }
    }
    export namespace GetLocalImageProductConfig {
      export type Response = {
        productConfig: ProductConfigItem[]
        deviceType: PascalCaseDeviceType
        snakecaseDeviceType: SnakecaseDeviceType
      } | null
    }

    export namespace RequestRemoteImageList {
      export interface Response {
        /**
         * The list of remote images.
         */
        images: (LocalImage.Stringifiable | RemoteImage.Stringifiable)[]
      }
    }
  }
}
