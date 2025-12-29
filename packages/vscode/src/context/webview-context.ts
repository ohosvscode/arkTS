import type { BirpcReturn } from 'birpc'
import type { IOnActivate } from 'unioc/vscode'
import fs from 'node:fs'
import path from 'node:path'
import { createBirpc } from 'birpc'
import * as vscode from 'vscode'
import { useCompiledWebviewPanel } from '../hook/compiled-webview'
import { keepClassInstanceThis } from '../utils/keep-this'

export abstract class WebviewContext<RemoteFunctions, LocalFunctions extends WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>> implements IOnActivate {
  protected _currentWebviewPanel: vscode.WebviewPanel | undefined
  protected _currentConnection: BirpcReturn<RemoteFunctions, LocalFunctions> | undefined
  protected _extensionUri: vscode.Uri

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
  ) {}

  public async createWebviewPanel(): Promise<void> {
    if (this._currentWebviewPanel) {
      return this._currentWebviewPanel.reveal(vscode.ViewColumn.One)
    }
    this._currentWebviewPanel = vscode.window.createWebviewPanel(
      'ets-create-project-view',
      'ETS Create Project',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        enableCommandUris: true,
        enableForms: true,
        retainContextWhenHidden: true,
      },
    )
    this._currentWebviewPanel.webview.html = fs.readFileSync(path.resolve(this._extensionUri.fsPath, 'build', this.htmlName), 'utf-8')
    useCompiledWebviewPanel(this._currentWebviewPanel, path.resolve(this._extensionUri.fsPath, 'build', this.htmlName))
    this._currentConnection = createBirpc<RemoteFunctions, LocalFunctions>(
      keepClassInstanceThis(this.serverFunction),
      {
        on: fn => this._currentWebviewPanel?.webview.onDidReceiveMessage(msg => fn(msg)),
        post: data => this._currentWebviewPanel?.webview.postMessage(data),
        serialize: data => JSON.stringify(data),
        deserialize: data => JSON.parse(data),
      },
    )
    this.serverFunction.onRpcInitialized(this._currentConnection as BirpcReturn<RemoteFunctions, LocalFunctions>)
    this._currentWebviewPanel.onDidDispose(() => {
      this._currentConnection?.$close()
      this._currentWebviewPanel = undefined
      this._currentConnection = undefined
    })
  }
}

export namespace WebviewContext {
  export interface ServerFunction<RemoteFunctions, LocalFunctions extends object = Record<string, never>> {
    /**
     * Called when the RPC connection is initialized.
     *
     * @param connection - The RPC connection.
     */
    onRpcInitialized(connection: BirpcReturn<RemoteFunctions, LocalFunctions>): void
  }
}
