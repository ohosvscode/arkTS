import type { ExtensionLogger } from '@arkts/shared/vscode'
import type { BirpcReturn } from 'birpc'
import type { FileSystemContext } from './file-system-context'
import path from 'node:path'
import { createBirpc } from 'birpc'
import * as vscode from 'vscode'
import { keepClassInstanceThis } from '../utils'

export interface WebviewContainer {
  webview: vscode.Webview
  onDidDispose(callback: () => void): void
}

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

  private async loadHtml<Container extends WebviewContainer>(webviewContainer: Container, htmlPath: string, initialURL?: string): Promise<void> {
    const content = await this.fsx.readFileToString(vscode.Uri.file(htmlPath))
    webviewContainer.webview.html = content.replace(/\{\{(.*?)\}\}/g, (_, href) => {
      const resourceUri = webviewContainer.webview.asWebviewUri(vscode.Uri.joinPath(vscode.Uri.file(path.dirname(htmlPath)), href?.trim?.() || href))
      return decodeURIComponent(resourceUri?.toString() || '')
    }).replace(/<head>/, `<head>${initialURL ? `<script>window.INITIAL_URL = '${initialURL}'</script>` : ''}`)
  }

  private createHtmlWatcher<Container extends WebviewContainer>(webviewContainer: Container, htmlPath: string, initialURL?: string): vscode.Disposable {
    const fsWatcher = vscode.workspace.createFileSystemWatcher(htmlPath)
    const onDidChangeDisposable = fsWatcher.onDidChange(() => this.loadHtml(webviewContainer, htmlPath, initialURL))
    const onDidAddDisposable = fsWatcher.onDidCreate(() => this.loadHtml(webviewContainer, htmlPath, initialURL))
    this.loadHtml(webviewContainer, htmlPath, initialURL)

    return new vscode.Disposable(() => {
      onDidChangeDisposable.dispose()
      onDidAddDisposable.dispose()
      fsWatcher.dispose()
    })
  }

  protected async attachWebview<T extends WebviewContainer>(
    webviewContainer: T,
    extensionUri: vscode.Uri,
    htmlName: string,
    serverFunction: WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>,
    initialURL?: string,
  ): Promise<void> {
    serverFunction.onBeforeRpcInitialized?.(this._currentConnection as BirpcReturn<RemoteFunctions, LocalFunctions>)
    webviewContainer.webview.html = await this.fsx.readFileToString(vscode.Uri.joinPath(extensionUri, 'build', htmlName))
    const disposable = this.createHtmlWatcher(webviewContainer, vscode.Uri.joinPath(extensionUri, 'build', htmlName).fsPath, initialURL)
    this._currentConnection = createBirpc<RemoteFunctions, LocalFunctions>(
      keepClassInstanceThis(serverFunction as LocalFunctions),
      {
        on: fn => webviewContainer?.webview.onDidReceiveMessage(msg => fn(msg)),
        post: data => webviewContainer?.webview.postMessage(data),
        serialize: data => JSON.stringify(data),
        deserialize: data => JSON.parse(data),
        onFunctionError: (error, functionName, functionArgs) => {
          console.error('Error in WebviewContext createBirpc onFunctionError, functionName: ', functionName, 'functionArgs: ', functionArgs)
          console.error(error)
        },
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
