import type { Arrayable } from '@vueuse/core'
import type { ProtocolContext } from '../../context/protocol-context'
import type { WebviewContext } from '../../context/webview-context'
import type { ParsedIfconfig } from '../utils/parse-ifconfig'

export namespace HdcManagerConnectionProtocol {
  export interface ClientFunction extends WebviewContext.ClientFunction {}

  export interface ServerFunction extends ProtocolContext<ClientFunction, ServerFunction> {
    /**
     * Get the path of the `hdc` executable. If not found, return `null`.
     */
    getHdcPath(): Promise<string | null>
    /**
     * Set the current connect key.
     */
    setCurrentConnectKey(connectKey: string | -1): void
    /**
     * Get the list of connected devices.
     */
    getConnectedDevices(): Promise<ServerFunction.GetConnectedDevices.Response>
    /**
     * Get the information of the device.
     *
     * @param connectKey The connect key of the device.
     * @returns The information of the device.
     */
    getDeviceInfo(connectKey: string): Promise<ServerFunction.GetDeviceInfo.Response>
    /**
     * Set the log level of the hilog.
     *
     * @param logLevel The log level to set.
     * @param connectKey The connect key of the device.
     */
    setLogLevel(logLevel: Arrayable<'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'>, connectKey: string): Promise<void>
    /**
     * Open the hilog.
     */
    openHilog(): Promise<void>
    /**
     * Open the connect device dialog.
     */
    openConnectDeviceDialog(): Promise<void>
    /**
     * Disconnect the device.
     *
     * @param connectKey The connect key of the device.
     */
    disconnectDevice(connectKey: string): Promise<void>
  }

  export namespace ServerFunction {
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

    export namespace GetDeviceInfo {
      export interface Response {
        /** @example 50 */
        cpuUsage: number
        /** @example 50 */
        memoryUsage: number
        /** Storage usage percentage (0–100) of root partition. @example 65.5 */
        storageUsage: number
        /** @example '22' */
        apiVersion: string
        /** @example 'arm64-v8a' */
        cpuAbilist: string
        /** @example 'MIA-AL00' */
        model: string
        /** @example 'HUAWEI' */
        brand: string
        /** @example 'HarmonyOS' */
        osDistName: string
        /** @example 'Nova 14 Pro' */
        productName: string
        /** @example '1.0.0' */
        incrementalVersion: string
        /** @example 'OpenHarmony-6.0.2.130' */
        fullName: string
        /** @example 100 */
        batteryCapacity: number
        /** @example 3.7 */
        batteryVoltage: number
        /** @example 250 */
        batteryTemperature: number
        /** @example 1 */
        batteryNowCurrent: number
        /** @example 1000 */
        batteryTotalEnergy: number
        /** @example 1000 */
        batteryRemainingEnergy: number
        /** @example 1000 */
        batteryRemainingChargeTime: number
        /** @example 0 | 1 */
        batteryStatus: 0 | 1
        /** @example 'Li-ion' | 'Li-poly' */
        batteryTechnology: string
        /** Ifconfig. */
        network: ParsedIfconfig[]
      }

      export const defaultResponse: Response = {
        cpuUsage: 0,
        memoryUsage: 0,
        storageUsage: 0,
        apiVersion: '',
        cpuAbilist: '',
        model: '',
        brand: '',
        osDistName: '',
        productName: '',
        incrementalVersion: '',
        fullName: '',
        batteryCapacity: 0,
        batteryVoltage: 0,
        batteryTemperature: 0,
        batteryNowCurrent: 0,
        batteryTotalEnergy: 0,
        batteryRemainingEnergy: 0,
        batteryRemainingChargeTime: 0,
        batteryTechnology: '',
        batteryStatus: 0,
        network: [],
      }
    }
  }
}
