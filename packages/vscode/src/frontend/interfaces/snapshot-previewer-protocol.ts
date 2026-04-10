import type { ProtocolContext } from '../../context/protocol-context'
import type { WebviewContext } from '../../context/webview-context'
import type { HdcManagerConnectionProtocol } from './hdc-connection-protocol'

export namespace SnapshotPreviewerProtocol {
  export interface Metadata extends SnapshotPreviewerProtocol.ClientFunction.OnLayoutRefresh.Event {}

  export interface ClientFunction extends WebviewContext.ClientFunction {
    /**
     * Called when the layout is refreshed.
     *
     * @param e - The event.
     */
    onLayoutRefresh(e: ClientFunction.OnLayoutRefresh.Event): Promise<void>
  }

  export namespace ClientFunction {
    export namespace OnLayoutRefresh {
      export interface Event {
        connectKey: string
        imageBase64: string
        layout: HdcManagerConnectionProtocol.ServerFunction.CaptureScreenAndOpenPreviewer.Response
      }
    }
  }

  export interface ServerFunction extends ProtocolContext<ClientFunction, ServerFunction, Metadata> {}
}
