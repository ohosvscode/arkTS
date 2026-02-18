import type { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'

export function onDidChangeLocalImagePath(callback: HdcManagerConnectionProtocol.ClientFunction['onDidChangeLocalImagePath']): void {
  onDidChangeLocalImagePath.callbacks.add(callback)
}

export namespace onDidChangeLocalImagePath {
  export const callbacks = new Set<HdcManagerConnectionProtocol.ClientFunction['onDidChangeLocalImagePath']>()
}
