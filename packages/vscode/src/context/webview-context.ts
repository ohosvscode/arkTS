import type { ExtensionLogger } from '@arkts/shared/vscode'
import type { BirpcReturn } from 'birpc'
import type * as vscode from 'vscode'
import fs from 'node:fs'
import path from 'node:path'
import { createBirpc } from 'birpc'
import { useCompiledWebviewPanel } from '../hook/compiled-webview'
import { keepClassInstanceThis } from '../utils/keep-this'

export abstract class WebviewContext<RemoteFunctions extends WebviewContext.ClientFunction, LocalFunctions extends WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>> {
  protected _currentConnection: BirpcReturn<RemoteFunctions, LocalFunctions> | undefined
  protected abstract readonly logger: ExtensionLogger

  protected attachWebview<T extends vscode.WebviewPanel | vscode.WebviewView>(
    webviewContainer: T,
    extensionUri: vscode.Uri,
    htmlName: string,
    serverFunction: WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>,
    initialURL?: string,
  ): void {
    serverFunction.onBeforeRpcInitialized?.(this._currentConnection as BirpcReturn<RemoteFunctions, LocalFunctions>)
    webviewContainer.webview.html = fs.readFileSync(path.resolve(extensionUri.fsPath, 'build', htmlName), 'utf-8')
    const disposable = useCompiledWebviewPanel(webviewContainer, path.resolve(extensionUri.fsPath, 'build', htmlName), initialURL)
    this._currentConnection = createBirpc<RemoteFunctions, LocalFunctions>(
      keepClassInstanceThis(serverFunction as LocalFunctions),
      {
        on: fn => webviewContainer?.webview.onDidReceiveMessage(msg => fn(msg)),
        post: data => webviewContainer?.webview.postMessage(data),
        serialize: data => JSON.stringify(data),
        deserialize: data => JSON.parse(data),
      },
    )
    serverFunction.onRpcInitialized?.(this._currentConnection as BirpcReturn<RemoteFunctions, LocalFunctions>, this)
    this.logger.getConsola().info(`Webview ${htmlName} created.`)
    webviewContainer.onDidDispose(() => {
      this.logger.getConsola().info(`Webview ${htmlName} disposed.`)
      disposable.dispose()
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
