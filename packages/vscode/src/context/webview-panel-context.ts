import type { ExtensionLogger } from '@arkts/shared/vscode'
import type { BirpcReturn } from 'birpc'
import type { Disposable, IOnActivate } from 'unioc/vscode'
import * as vscode from 'vscode'
import { WebviewContext } from './webview-context'

export abstract class WebviewPanelContext<RemoteFunctions extends WebviewContext.ClientFunction, LocalFunctions extends WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>> extends WebviewContext<RemoteFunctions, LocalFunctions> implements IOnActivate, Disposable {
  protected _currentWebviewPanel: vscode.WebviewPanel | undefined
  protected _currentConnection: BirpcReturn<RemoteFunctions, LocalFunctions> | undefined
  protected _extensionUri: vscode.Uri
  protected _context: vscode.ExtensionContext | undefined

  protected abstract readonly serverFunction: LocalFunctions
  protected abstract readonly logger: ExtensionLogger

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
    private readonly initialURL?: string,
  ) {
    super()
  }

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
      this._currentWebviewPanel.reveal()
      return this.logger.getConsola().error(`Webview panel ${this.htmlName} already exists.`)
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
    super.attachWebview(this._currentWebviewPanel, this._extensionUri, this.htmlName, this.serverFunction, this.initialURL)
    this._currentWebviewPanel.onDidDispose(() => this._currentWebviewPanel = undefined)
  }
}
