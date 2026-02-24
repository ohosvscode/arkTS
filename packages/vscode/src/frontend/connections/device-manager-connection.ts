import type { BirpcReturn } from 'birpc'
import type { DeviceManagerProtocol } from '../interfaces/device-manager-protocol'
import type { Connection } from '../utils/connection'
import { createConnection } from '../utils/connection'

export interface DeviceManagerConnection extends Connection<DeviceManagerProtocol.ServerFunction, DeviceManagerProtocol.ClientFunction> {
  connection: BirpcReturn<DeviceManagerProtocol.ServerFunction, DeviceManagerProtocol.ClientFunction>
  onDidChangeLocalImagePath(callback: DeviceManagerProtocol.ClientFunction['onDidChangeLocalImagePath']): void
  onDidRefresh(callback: () => void): void
}

export function useDeviceManagerConnection(): DeviceManagerConnection {
  const onDidChangeLocalImagePathCallbacks = new Set<DeviceManagerProtocol.ClientFunction['onDidChangeLocalImagePath']>()
  const onDidChangeLocalImagePath = (callback: DeviceManagerProtocol.ClientFunction['onDidChangeLocalImagePath']): void => {
    onDidChangeLocalImagePathCallbacks.add(callback)
  }

  const onDidRefreshCallbacks = new Set<() => void>()
  const onDidRefresh = (callback: () => void): void => {
    onDidRefreshCallbacks.add(callback)
  }

  const connection = createConnection<DeviceManagerProtocol.ServerFunction, DeviceManagerProtocol.ClientFunction>({
    onDidChangeLocalImagePath: (path, isValid) => onDidChangeLocalImagePathCallbacks.forEach(callback => callback(path, isValid)),
    onDidRefresh: () => onDidRefreshCallbacks.forEach(callback => callback()),
  })

  return {
    onDidChangeLocalImagePath,
    onDidRefresh,
    ...connection,
  }
}
