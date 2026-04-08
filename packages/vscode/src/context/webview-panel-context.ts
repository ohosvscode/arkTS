import type { ExtensionLogger } from '@arkts/shared/vscode'
import type { EventListener } from '@vstils/core'
import type { Disposable, IOnActivate } from 'unioc/vscode'
import type { AttachWebviewContext } from './webview-context'
import type { WebviewContainer } from './webview-html-loader'
import * as vscode from 'vscode'
import { WebviewContext } from './webview-context'

export interface CreateWebviewPanelContext<
  RemoteFunctions extends WebviewContext.ClientFunction,
  LocalFunctions extends WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>,
  TWebviewContainer extends WebviewContainer = WebviewContainer,
> extends Omit<AttachWebviewContext<RemoteFunctions, LocalFunctions, TWebviewContainer>, 'webviewContainer' | 'extensionUri' | 'htmlName' | 'serverFunction' | 'initialURL'> {
  /**
   * When the webview panel is revealed.
   */
  readonly onReveal?: EventListener<void>
  /**
   * The metadata.
   */
  readonly metadata?: any
}

export abstract class WebviewPanelContext<RemoteFunctions extends WebviewContext.ClientFunction, LocalFunctions extends WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>> extends WebviewContext<RemoteFunctions, LocalFunctions> implements IOnActivate, Disposable {
  protected _currentWebviewPanel: vscode.WebviewPanel | undefined
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
      this.disposeCurrentConnection()
    }
  }

  async hasWebviewPanel(): Promise<boolean> {
    return this._currentWebviewPanel !== undefined
  }

  public async createWebviewPanel(ctx: CreateWebviewPanelContext<RemoteFunctions, LocalFunctions, vscode.WebviewPanel> = {}): Promise<void> {
    if (this._currentWebviewPanel) {
      this._currentWebviewPanel.reveal()
      await ctx.onReveal?.()
      return this.logger.getConsola().warn(`Webview panel ${this.htmlName} already exists, will reveal it.`)
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
    this._currentWebviewPanel.onDidDispose(() => this._currentWebviewPanel = undefined)

    await super.attachWebview({
      webviewContainer: this._currentWebviewPanel,
      extensionUri: this._extensionUri,
      htmlName: this.htmlName,
      serverFunction: this.serverFunction,
      initialURL: this.initialURL,
      beforeOnInitialized: ctx.beforeOnInitialized,
      metadata: ctx.metadata,
    })
  }
}
