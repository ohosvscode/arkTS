import type { SnapshotPreviewerProtocol } from '../interfaces/snapshot-previewer-protocol'
import { Autowired } from 'unioc'
import { ExtensionContext, Translator } from 'unioc/vscode'
import { ProtocolContext } from '../../context/protocol-context'
import { InitialCallbackEvent, WebviewContext } from '../../context/webview-context'

export class SnapshotPreviewerFunctionImpl extends ProtocolContext<SnapshotPreviewerProtocol.ClientFunction, SnapshotPreviewerProtocol.ServerFunction, SnapshotPreviewerProtocol.Metadata> implements SnapshotPreviewerProtocol.ServerFunction {
  @Autowired(Translator) protected readonly translator: Translator
  @Autowired(ExtensionContext) protected readonly extensionContext: ExtensionContext

  private ctx: InitialCallbackEvent<SnapshotPreviewerProtocol.ClientFunction, SnapshotPreviewerProtocol.ServerFunction, SnapshotPreviewerProtocol.Metadata, WebviewContext<SnapshotPreviewerProtocol.ClientFunction, SnapshotPreviewerProtocol.ServerFunction>> | undefined

  onRpcInitialized(e: InitialCallbackEvent<SnapshotPreviewerProtocol.ClientFunction, SnapshotPreviewerProtocol.ServerFunction, SnapshotPreviewerProtocol.Metadata, WebviewContext<SnapshotPreviewerProtocol.ClientFunction, SnapshotPreviewerProtocol.ServerFunction>>): void {
    super.onRpcInitialized(e)
    this.ctx = e
  }

  onMounted(): void {
    super.onMounted()
    this.ctx?.connection.onLayoutRefresh?.(this.ctx.metadata)
  }
}
