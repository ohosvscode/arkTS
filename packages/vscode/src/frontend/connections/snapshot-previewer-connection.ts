import type { Event } from '@vstils/core'
import type { SnapshotPreviewerProtocol } from '../interfaces/snapshot-previewer-protocol'
import type { Connection } from '../utils/connection'
import { createEventEmitter } from '@vstils/core'
import { createConnection } from '../utils/connection'

export interface SnapshotPreviewerConnection extends Connection<SnapshotPreviewerProtocol.ServerFunction, SnapshotPreviewerProtocol.ClientFunction> {
  onLayoutRefresh: Event<SnapshotPreviewerProtocol.ClientFunction.OnLayoutRefresh.Event>
}

export function useSnapshotPreviewerConnection(): SnapshotPreviewerConnection {
  const onLayoutRefreshEmitter = createEventEmitter<SnapshotPreviewerProtocol.ClientFunction.OnLayoutRefresh.Event>()

  const connection = createConnection<SnapshotPreviewerProtocol.ServerFunction, SnapshotPreviewerProtocol.ClientFunction>({
    onLayoutRefresh: async e => onLayoutRefreshEmitter.fire(e),
  })

  return {
    ...connection,
    onLayoutRefresh: onLayoutRefreshEmitter.event,
  }
}
