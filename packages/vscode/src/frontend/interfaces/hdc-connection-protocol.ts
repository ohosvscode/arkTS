import type { ProtocolContext } from '../../context/protocol-context'
import type { WebviewContext } from '../../context/webview-context'
import process from 'node:process'

export namespace HdcManagerConnectionProtocol {
  export interface ClientFunction extends WebviewContext.ClientFunction {
    /**
     * Called when the local image path changes.
     */
    onDidChangeLocalImagePath(path: string, isValid: ServerFunction.isValidLocalImagePath.Response): void
  }

  export interface ServerFunction extends ProtocolContext<ClientFunction, ServerFunction> {
    /**
     * Get the path of the `hdc` executable. If not found, return `null`.
     */
    getHdcPath(): Promise<string | null>
    /**
     * Get the path of the local image folder.
     */
    getLocalImagePath(): Promise<string>
    /**
     * Check if the given path is a valid local image folder.
     *
     * @param path The path to check.
     * @returns `'not-folder'` if the path is not a folder, `'not-exists'` if the path does not exist, `true` if the path is a valid local image folder.
     */
    isValidLocalImagePath(path: string): Promise<'not-folder' | 'not-exists' | 'invalid-permission' | true>
    /**
     * Get the list of connected devices.
     */
    getConnectedDevices(): Promise<ServerFunction.GetConnectedDevices.Response>
    /**
     * Copy the given text to the clipboard.
     *
     * @param text The text to copy.
     * @param showMessage Whether to show a success message after copying. Default is `true`.
     */
    copyTextToClipboard(text: string, showMessage?: boolean): Promise<void>
    /**
     * Request the list of remote images by operating system and architecture.
     *
     * @returns The list of remote images by operating system and architecture.
     */
    requestRemoteImageList(request?: ServerFunction.RequestRemoteImageList.Request): Promise<ServerFunction.RequestRemoteImageList.Response>
    /**
     * Download the remote image.
     *
     * @param image The remote image to download.
     */
    requestRemoteImageDownload(image: ServerFunction.RequestRemoteImageList.Image): Promise<void>
  }

  export namespace ServerFunction {
    export namespace isValidLocalImagePath {
      export type Response = 'not-folder' | 'not-exists' | 'invalid-permission' | true
    }

    export namespace GetConnectedDevices {
      export interface Device {
        /**
         * The unique key to connect to the device.
         *
         * @example '127.0.0.1:5555'
         */
        connectKey: string
      }

      export interface Response {
        /**
         * The list of connected devices.
         */
        devices: Device[]
      }
    }

    export namespace RequestRemoteImageList {
      export type OS = 'windows' | 'mac' | 'linux'
      export type Arch = 'x86' | 'arm64'

      export interface Request {
        /**
         * Default is current operating system.
         */
        os?: OS
        /**
         * Default is current architecture.
         */
        arch?: Arch
      }

      export namespace Request {
        export function resolve(value: Request = {}): Required<Request> {
          return {
            os: value.os ?? process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux',
            arch: value.arch ?? process.arch === 'x64' ? 'x86' : 'arm64',
          }
        }
      }

      export interface Image {
        /**
         * The unique identifier of the remote image.
         *
         * @example 'system-image,HarmonyOS-6.0.0,phone_all_arm'
         */
        id: Image.Id
        /**
         * The version of the remote image.
         *
         * @example '6.0.0.48'
         */
        version: string
        /**
         * The API version of the remote image.
         *
         * @example 'API21'
         */
        apiVersion: Image.ApiVersion
        /**
         * The numeric API version of the remote image.
         *
         * @example 21
         */
        numericApiVersion: number
        /**
         * The target version of the remote image.
         *
         * @example '6.0.0' is mean HarmonyOS 6.0.0.
         */
        targetVersion: string
        /**
         * The device type of the remote image.
         *
         * @example 'phone'
         */
        deviceType: string
        /**
         * The system name of the remote image.
         *
         * @example 'HarmonyOS'
         */
        systemName: string
      }

      export namespace Image {
        export type Id = `${string},${string},${string}`
        export type ApiVersion = `API${number}`
        export type DeviceType = 'phone' | 'tablet' | 'pc' | 'wearable' | 'tv' | 'foldable' | 'widefold' | '2in1' | (string & {})
      }

      export interface Response {
        /**
         * The list of remote images.
         */
        images: Image[]
      }
    }
  }
}
