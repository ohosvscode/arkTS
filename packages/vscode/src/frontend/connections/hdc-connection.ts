import type { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'
import type { Connection } from '../utils/connection'
import { createConnection } from '../utils/connection'

export function useHdcConnection(): Connection<HdcManagerConnectionProtocol.ServerFunction, HdcManagerConnectionProtocol.ClientFunction> {
  return createConnection<HdcManagerConnectionProtocol.ServerFunction, HdcManagerConnectionProtocol.ClientFunction>({})
}
