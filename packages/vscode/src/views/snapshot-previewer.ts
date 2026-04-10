import type { SnapshotPreviewerProtocol } from '../frontend/interfaces/snapshot-previewer-protocol'
import { ExtensionLogger } from '@arkts/shared/vscode'
import { Autowired, Service } from 'unioc'
import { Disposable } from 'unioc/vscode'
import { FileSystemContext } from '../context/file-system-context'
import { WebviewPanelContext } from '../context/webview-panel-context'
import { SnapshotPreviewerFunctionImpl } from '../frontend/functions/snapshot-previewer-function'

@Service
@Disposable
export class SnapshotPreviewer extends WebviewPanelContext<SnapshotPreviewerProtocol.ClientFunction, SnapshotPreviewerProtocol.ServerFunction> {
  @Autowired protected readonly serverFunction: SnapshotPreviewerFunctionImpl
  @Autowired protected readonly logger: ExtensionLogger
  @Autowired protected readonly fsx: FileSystemContext

  constructor() {
    super('snapshot-previewer.html', 'ets.snapshotPreviewer', 'Snapshot Previewer', '/snapshot-previewer')
  }
}
