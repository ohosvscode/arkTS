import type { ExtensionLogger } from '@arkts/shared/vscode'
import type { BirpcReturn } from 'birpc'
import type * as vscode from 'vscode'
import type { FileSystemContext } from './file-system-context'
import type { WebviewContainer } from './webview-html-loader'
import { createBirpc } from 'birpc'
import { keepClassInstanceThis } from '../utils'
import { WebviewHtmlLoader } from './webview-html-loader'

export abstract class WebviewContext<RemoteFunctions extends WebviewContext.ClientFunction, LocalFunctions extends WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>> {
  private _currentConnection: BirpcReturn<RemoteFunctions, LocalFunctions> | undefined
  protected abstract readonly logger: ExtensionLogger
  protected abstract readonly fsx: FileSystemContext

  getCurrentConnection(): BirpcReturn<RemoteFunctions, LocalFunctions> {
    return this._currentConnection as BirpcReturn<RemoteFunctions, LocalFunctions>
  }

  disposeCurrentConnection(): void {
    this._currentConnection?.$close()
    this._currentConnection = undefined
  }

  protected async attachWebview<T extends WebviewContainer>(
    webviewContainer: T,
    extensionUri: vscode.Uri,
    htmlName: string,
    serverFunction: WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>,
    initialURL?: string,
  ): Promise<void> {
    serverFunction.onBeforeRpcInitialized?.(this._currentConnection as BirpcReturn<RemoteFunctions, LocalFunctions>)
    const webviewHtmlLoader = new WebviewHtmlLoader(this.fsx, extensionUri, webviewContainer, htmlName, initialURL)
    const htmlWatcherDisposable = await webviewHtmlLoader.createHtmlWatcher()
    this._currentConnection = createBirpc<RemoteFunctions, LocalFunctions>(
      keepClassInstanceThis(serverFunction as LocalFunctions),
      {
        on: fn => webviewContainer?.webview.onDidReceiveMessage(msg => fn(msg)),
        post: data => webviewContainer?.webview.postMessage(data),
        serialize: data => JSON.stringify(data),
        deserialize: data => JSON.parse(data),
        onFunctionError: (error, functionName, functionArgs) => {
          this.logger.getConsola().error(`Error in WebviewContext ${htmlName} createBirpc onFunctionError, functionName: ${functionName}, functionArgs: ${functionArgs}`)
          this.logger.getConsola().error(error)
          this.logger.getConsola().error(error.stack)
          console.error(error)
        },
      },
    )
    serverFunction.onRpcInitialized?.(this._currentConnection as BirpcReturn<RemoteFunctions, LocalFunctions>, this)
    this.logger.getConsola().info(`Webview ${htmlName} created.`)
    webviewContainer.onDidDispose(() => {
      this.logger.getConsola().info(`Webview ${htmlName} disposed.`)
      htmlWatcherDisposable.dispose()
      this._currentConnection?.$close()
      serverFunction.dispose?.()
      this._currentConnection = undefined
    })
  }
}

export namespace WebviewContext {
  export type PartialClientFunction<T extends WebviewContext.ClientFunction> = Omit<T, keyof WebviewContext.ClientFunction> & Partial<WebviewContext.ClientFunction>

  export interface ClientFunction {
    /**
     * Called when the active color theme changes.
     */
    onDidChangeActiveColorTheme(): void
  }

  export interface ServerFunction<RemoteFunctions extends WebviewContext.ClientFunction, LocalFunctions extends ServerFunction<RemoteFunctions, LocalFunctions>> {
    /**
     * Called when the RPC connection is initialized.
     *
     * @param connection - The RPC connection.
     */
    onRpcInitialized?(connection: BirpcReturn<RemoteFunctions, LocalFunctions>, context: WebviewContext<RemoteFunctions, LocalFunctions>): void
    /**
     * Called before the RPC connection is initialized.
     *
     * @param connection - The RPC connection.
     */
    onBeforeRpcInitialized?(connection: BirpcReturn<RemoteFunctions, LocalFunctions>): void
    /**
     * Called when the webview panel is disposed.
     */
    dispose?(): void
  }
}
