import type { BirpcReturn } from 'birpc'
import type { Disposable, IOnActivate } from 'unioc/vscode'
import type { ProtocolContext } from './protocol-context'
import fs from 'node:fs'
import path from 'node:path'
import { createBirpc } from 'birpc'
import * as vscode from 'vscode'
import { useCompiledWebviewPanel } from '../hook/compiled-webview'
import { keepClassInstanceThis } from '../utils/keep-this'

export abstract class WebviewContext<RemoteFunctions, LocalFunctions extends WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>> implements IOnActivate, Disposable {
  protected _currentWebviewPanel: vscode.WebviewPanel | undefined
  protected _currentConnection: BirpcReturn<RemoteFunctions, LocalFunctions> | undefined
  protected _extensionUri: vscode.Uri
  protected _context: vscode.ExtensionContext | undefined

  protected abstract readonly serverFunction: LocalFunctions

  onActivate(context: vscode.ExtensionContext): void {
    this._extensionUri = context.extensionUri
  }

  constructor(
    /**
     * Must call `super` with the HTML file name.
     *
     * @requires
     */
    private readonly htmlName: string,
    private readonly viewType: string,
    private readonly title: string,
  ) {}

  public dispose(): void {
    if (this._currentWebviewPanel) {
      this._currentWebviewPanel.dispose()
      this._currentWebviewPanel = undefined
      this._currentConnection?.$close()
      this._currentConnection = undefined
    }
  }

  public async createWebviewPanel(): Promise<void> {
    if (this._currentWebviewPanel) {
      return this._currentWebviewPanel.reveal(vscode.ViewColumn.One)
    }
    this._currentWebviewPanel = vscode.window.createWebviewPanel(
      this.viewType,
      this.title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        enableCommandUris: true,
        enableForms: true,
        retainContextWhenHidden: true,
      },
    )
    this.serverFunction.onBeforeRpcInitialized?.(this._currentConnection as BirpcReturn<RemoteFunctions, LocalFunctions>)
    this._currentWebviewPanel.webview.html = fs.readFileSync(path.resolve(this._extensionUri.fsPath, 'build', this.htmlName), 'utf-8')
    const disposable = useCompiledWebviewPanel(this._currentWebviewPanel, path.resolve(this._extensionUri.fsPath, 'build', this.htmlName))
    this._currentConnection = createBirpc<RemoteFunctions, LocalFunctions>(
      keepClassInstanceThis(this.serverFunction),
      {
        on: fn => this._currentWebviewPanel?.webview.onDidReceiveMessage(msg => fn(msg)),
        post: data => this._currentWebviewPanel?.webview.postMessage(data),
        serialize: data => JSON.stringify(data),
        deserialize: data => JSON.parse(data),
      },
    )
    this.serverFunction.onRpcInitialized?.(this._currentConnection as BirpcReturn<RemoteFunctions, LocalFunctions>, this)
    this._context?.subscriptions.push(
      this._currentWebviewPanel.onDidDispose(() => {
        disposable.dispose()
        this._currentConnection?.$close()
        this.serverFunction.dispose?.()
        this._currentWebviewPanel = undefined
        this._currentConnection = undefined
      }),
    )
  }
}

export namespace WebviewContext {
  export interface ServerFunction<RemoteFunctions, LocalFunctions extends ServerFunction<RemoteFunctions, LocalFunctions>> extends ProtocolContext {
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
