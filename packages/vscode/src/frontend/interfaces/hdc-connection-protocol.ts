import type { Arrayable } from '@vstils/core'
import type { ProtocolContext } from '../../context/protocol-context'
import type { WebviewContext } from '../../context/webview-context'

export namespace HdcManagerConnectionProtocol {
  export interface ClientFunction extends WebviewContext.ClientFunction {
    /**
     * Refresh the layouts.
     */
    onRefreshLayouts(): Promise<void>
    /**
     * Collapse all layouts.
     */
    onCollapseAllLayouts(): Promise<void>
    /**
     * Expand all layouts.
     */
    onExpandAllLayouts(): Promise<void>
    /**
     * Set current application view type.
     *
     * @param viewType The view type to set.
     */
    setApplicationViewType(viewType: ClientFunction.ApplicationViewType): Promise<void>
  }

  export namespace ClientFunction {
    export type ApplicationViewType = 'grid' | 'list'
  }

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
    getConnectedDevices(): Promise<string[]>
    /**
     * Set the log level of the hilog.
     *
     * @param logLevel The log level to set.
     * @param connectKey The connect key of the device.
     */
    setLogLevel(logLevel: Arrayable<'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'>, connectKey: string): Promise<void>
    /**
     * Get the list of applications.
     *
     * @param connectKey The connect key of the device.
     * @returns The list of applications.
     */
    getApplications(connectKey: string): Promise<ServerFunction.GetApplications.Response>
    /**
     * Get the information of the remote application.
     *
     * @param pkgName The package name of the application.
     * @returns The information of the remote application.
     */
    getRemoteApplicationInfo(pkgName: string): Promise<ServerFunction.GetRemoteApplicationInfo.Response>
    /**
     * Start the ability.
     *
     * @param connectKey The connect key of the device.
     * @param bundleName The bundle name of the application.
     * @param abilityName The ability name of the application.
     */
    startAbility(connectKey: string, bundleName: string, abilityName: string): Promise<void>
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
    /**
     * Get the processes information of the device.
     *
     * @param connectKey The connect key of the device.
     * @returns The processes information of the device.
     */
    getProcesses(connectKey: string): Promise<ServerFunction.GetProcesses.Response>
    /**
     * Capture the screen of the device.
     *
     * @param connectKey The connect key of the device.
     * @returns The screenshot of the device.
     */
    captureScreenAndOpenPreviewer(connectKey: string): Promise<ServerFunction.CaptureScreenAndOpenPreviewer.Response>
    /**
     * Set the current tab.
     *
     * @param tab The tab to set.
     */
    setCurrentTab(tab: ServerFunction.SetCurrentTab.Tab): Promise<void>
  }

  export namespace ServerFunction {
    export namespace GetApplications {
      export interface Application {
        /** @example 'com.example.app' */
        bundleName: string
        /** @example '1.0.0' */
        versionName?: string
        /** The install timestamp of the app. */
        installTime?: number
        /** @example 'entry' */
        mainEntry?: string
        /** @example 'EntryAbility' */
        mainAbility?: string
        /** @example 'com.example.app' */
        vendor?: string
        /** @example '50000012' */
        apiTargetVersion?: string
        /** @example 'Release' */
        releaseType?: string
      }

      export interface Response {
        applications: Application[]
      }

      export const defaultResponse: Response = {
        applications: [],
      }
    }

    export namespace GetRemoteApplicationInfo {
      export interface Response {
        /** @example 'Example App' */
        name?: string
        /** @example 'https://example.com/icon.png' */
        icon?: string
        /** @example 'Description of the app' */
        description?: string
        /** @example 'Developer Name' */
        developerName?: string
        /** @example 'System App' */
        kindName?: string
        /** @example 'System' */
        kindTypeName?: string
      }
    }

    export namespace GetProcesses {
      export interface Task {
        total: number
        running: number
        sleeping: number
        stopped: number
        zombie: number
      }

      export interface Process {
        pid: number
        user: string
        priority: number
        nice: number
        virt: string
        res: string
        shr: string
        status: string
        cpu: number
        mem: number
        time: string
        command: string
      }

      export interface Memory {
        total: number
        used: number
        free: number
        buffers: number
      }

      export interface Swap {
        total: number
        used: number
        free: number
        cached: number
      }

      export interface CPU {
        total: number
        user: number
        system: number
        idle: number
        ioWait: number
        irq: number
        softIrq: number
        host: number
      }

      export interface Response {
        processes: Process[]
        memory: Memory
        swap: Swap
        cpu: CPU
        tasks: Task
      }

      export const defaultTask: Task = {
        total: 0,
        running: 0,
        sleeping: 0,
        stopped: 0,
        zombie: 0,
      }

      export const defaultMemory: Memory = {
        total: 0,
        used: 0,
        free: 0,
        buffers: 0,
      }

      export const defaultSwap: Swap = {
        total: 0,
        used: 0,
        free: 0,
        cached: 0,
      }

      export const defaultCPU: CPU = {
        total: 0,
        user: 0,
        system: 0,
        idle: 0,
        ioWait: 0,
        irq: 0,
        softIrq: 0,
        host: 0,
      }

      export const defaultResponse: Response = {
        processes: [],
        memory: defaultMemory,
        swap: defaultSwap,
        cpu: defaultCPU,
        tasks: defaultTask,
      }
    }

    export namespace CaptureScreenAndOpenPreviewer {
      export interface Response {
        attributes: Record<string, any>
        children: Response[]
      }

      export const defaultResponse: Response = {
        attributes: {},
        children: [],
      }
    }

    export namespace SetCurrentTab {
      export type Tab = 'overview' | 'application' | 'processes' | 'layouts'
    }
  }
}
