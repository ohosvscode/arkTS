import type { Event } from '@vstils/core'
import type { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'
import type { Connection } from '../utils/connection'
import { createEventEmitter } from '@vstils/core'
import { createConnection } from '../utils/connection'

export interface HdcConnection extends Connection<HdcManagerConnectionProtocol.ServerFunction, HdcManagerConnectionProtocol.ClientFunction> {
  readonly onRefreshLayouts: Event<void>
  readonly onCollapseAllLayouts: Event<void>
  readonly onExpandAllLayouts: Event<void>
  readonly onSetApplicationViewType: Event<HdcManagerConnectionProtocol.ClientFunction.ApplicationViewType>
}

export function useHdcConnection(): HdcConnection {
  const onRefreshLayoutsEmitter = createEventEmitter<void>()
  const onCollapseAllLayoutsEmitter = createEventEmitter<void>()
  const onExpandAllLayoutsEmitter = createEventEmitter<void>()
  const onSetApplicationViewTypeEmitter = createEventEmitter<HdcManagerConnectionProtocol.ClientFunction.ApplicationViewType>()

  const connection = createConnection<HdcManagerConnectionProtocol.ServerFunction, HdcManagerConnectionProtocol.ClientFunction>({
    onRefreshLayouts: async () => onRefreshLayoutsEmitter.fire(),
    onCollapseAllLayouts: async () => onCollapseAllLayoutsEmitter.fire(),
    onExpandAllLayouts: async () => onExpandAllLayoutsEmitter.fire(),
    setApplicationViewType: async viewType => onSetApplicationViewTypeEmitter.fire(viewType),
  })

  return {
    ...connection,
    onRefreshLayouts: onRefreshLayoutsEmitter.event,
    onCollapseAllLayouts: onCollapseAllLayoutsEmitter.event,
    onExpandAllLayouts: onExpandAllLayoutsEmitter.event,
    onSetApplicationViewType: onSetApplicationViewTypeEmitter.event,
  }
}
