import type { BirpcReturn } from 'birpc'
import type { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'
import { createConnection } from '../utils/connection'

export function useHdcConnection(): BirpcReturn<HdcManagerConnectionProtocol.ServerFunction, HdcManagerConnectionProtocol.ClientFunction> {
  return createConnection<HdcManagerConnectionProtocol.ServerFunction, HdcManagerConnectionProtocol.ClientFunction>({
    onDidChangeLocalImagePath: (path, isValid) => onDidChangeLocalImagePath.callbacks.forEach(callback => callback(path, isValid)),
    onDidRefresh: () => onDidRefresh.callbacks.forEach(callback => callback()),
  }) as BirpcReturn<HdcManagerConnectionProtocol.ServerFunction, HdcManagerConnectionProtocol.ClientFunction>
}
