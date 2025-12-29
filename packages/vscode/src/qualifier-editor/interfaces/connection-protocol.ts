import type { WebviewContext } from '../../context/webview-context'

export namespace QualifierEditorConnectionProtocol {
  export interface ClientFunction {}

  export interface ServerFunction extends WebviewContext.ServerFunction<ClientFunction, ServerFunction> {}
}
