import type { ExtensionLogger } from '@arkts/shared/vscode'
import type { Awaitable, EventListener } from '@vstils/core'
import type { BirpcReturn } from 'birpc'
import type { ExtensionContext } from 'unioc/vscode'
import type { FileSystemContext } from './file-system-context'
import type { WebviewContainer } from './webview-html-loader'
import { keepClassInstanceThis } from '@vstils/core'
import { createBirpc } from 'birpc'
import * as vscode from 'vscode'
import { WebviewHtmlLoader } from './webview-html-loader'

export interface InitialCallbackEvent<
  RemoteFunctions extends WebviewContext.ClientFunction,
  LocalFunctions extends WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>,
  T = any,
  Context extends WebviewContext<RemoteFunctions, LocalFunctions> = WebviewContext<RemoteFunctions, LocalFunctions>,
> {
  readonly webviewContainer: WebviewContainer
  readonly connection: BirpcReturn<RemoteFunctions, LocalFunctions>
  readonly webviewContext: Context
  readonly metadata: T
}

export interface AttachWebviewContext<
  RemoteFunctions extends WebviewContext.ClientFunction,
  LocalFunctions extends WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>,
  T = any,
  TWebviewContainer extends WebviewContainer = WebviewContainer,
> {
  /**
   * The webview container. You can use {@linkcode vscode.window.createWebviewPanel} to create a webview panel,
   * or {@linkcode vscode.window.registerWebviewViewProvider} to resolve a webview view and attach it.
   */
  readonly webviewContainer: TWebviewContainer
  /**
   * The extension root URI. Please use {@linkcode ExtensionContext.extensionUri}.
   */
  readonly extensionUri: vscode.Uri
  /**
   * The HTML file name.
   */
  readonly htmlName: string
  /**
   * The server function class/object.
   */
  readonly serverFunction: WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>
  /**
   * The initial URL.
   */
  readonly initialURL?: string
  /**
   * The before on initialized event listener.
   */
  readonly beforeOnInitialized?: EventListener<InitialCallbackEvent<RemoteFunctions, LocalFunctions>>
  /**
   * The metadata.
   */
  readonly metadata?: T
}

export abstract class WebviewContext<RemoteFunctions extends WebviewContext.ClientFunction, LocalFunctions extends WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>> {
  private _currentConnection: BirpcReturn<RemoteFunctions, LocalFunctions> | undefined
  protected abstract readonly logger: ExtensionLogger
  protected abstract readonly fsx: FileSystemContext

  getCurrentConnection(): BirpcReturn<RemoteFunctions, LocalFunctions> {
    return this._currentConnection as BirpcReturn<RemoteFunctions, LocalFunctions>
  }

  disposeCurrentConnection(): void {
    if (typeof this._currentConnection?.$closed === 'boolean' && !this._currentConnection?.$closed) {
      this.logger.getConsola().info(`Disposing current connection: current rpc connection is not closed, closing it.`)
      this._currentConnection?.$close()
    }
    this._currentConnection = undefined
  }

  private handleFunctionError(htmlName: string, error: Error, functionName?: string, functionArgs?: any[], type: 'FunctionError' | 'GeneralError' | 'TimeoutError' = 'FunctionError'): void {
    if (error instanceof Error && error.message.includes('onMounted') && error.message.includes('not found')) return
    this.logger.getConsola().error(`${type} in WebviewContext ${htmlName} birpc, functionName: ${functionName ?? 'undefined'}, functionArgs: ${functionArgs ?? 'undefined'}`)
    this.logger.getConsola().error(error)
    vscode.window.showErrorMessage(`${type} in WebviewContext ${htmlName} birpc: ${error?.message ?? 'unknown error'}, functionName: ${functionName ?? 'undefined'}, functionArgs: ${functionArgs ?? 'undefined'}`)
  }

  private createInitialCallbackEvent<TWebviewContainer extends WebviewContainer = WebviewContainer>(ctx: AttachWebviewContext<RemoteFunctions, LocalFunctions, TWebviewContainer>): InitialCallbackEvent<RemoteFunctions, LocalFunctions> {
    return {
      connection: this._currentConnection!,
      webviewContext: this,
      webviewContainer: ctx.webviewContainer,
      metadata: ctx.metadata,
    }
  }

  /**
   * Attach birpc to the webview container.
   *
   * @param ctx - The attach webview options.
   */
  protected async attachWebview<TWebviewContainer extends WebviewContainer = WebviewContainer>(ctx: AttachWebviewContext<RemoteFunctions, LocalFunctions, TWebviewContainer>): Promise<void> {
    try {
      const webviewHtmlLoader = new WebviewHtmlLoader(this.fsx, ctx)
      const htmlWatcherDisposable = await webviewHtmlLoader.createHtmlWatcher()
      ctx.webviewContainer.onDidDispose(() => {
        this.logger.getConsola().info(`Webview ${ctx.htmlName} disposed, disposing webview html loader.`)
        htmlWatcherDisposable.dispose()
      })
      this._currentConnection = createBirpc<RemoteFunctions, LocalFunctions>(
        keepClassInstanceThis(ctx.serverFunction as LocalFunctions),
        {
          on: fn => ctx.webviewContainer?.webview.onDidReceiveMessage(msg => fn(msg)),
          post: data => ctx.webviewContainer?.webview.postMessage(data),
          serialize: data => JSON.stringify(data),
          deserialize: data => JSON.parse(data),
          onFunctionError: (error, functionName, functionArgs) => this.handleFunctionError(ctx.htmlName, error, functionName, functionArgs),
          onGeneralError: (error, functionName, functionArgs) => this.handleFunctionError(ctx.htmlName, error, functionName, functionArgs),
          onTimeoutError: (functionName, functionArgs) => this.handleFunctionError(ctx.htmlName, new Error('Timeout error'), functionName, functionArgs),
        },
      )
      ctx.webviewContainer.onDidDispose(() => {
        this.logger.getConsola().info(`Webview ${ctx.htmlName} disposed. Disposing current rpc connection.`)
        this.disposeCurrentConnection()
        this.logger.getConsola().info(`Webview ${ctx.htmlName} disposed. Disposing server function.`)
        ctx.serverFunction.dispose?.()
      })

      // Call before on initialized and on rpc initialized
      const initialEvent = this.createInitialCallbackEvent(ctx)
      await ctx.beforeOnInitialized?.(initialEvent)
      await ctx.serverFunction.onRpcInitialized?.(initialEvent)
      this.logger.getConsola().info(`Webview ${ctx.htmlName} created.`)
    }
    catch (error) {
      this.logger.getConsola().error(`Failed to attach webview to webview container ${ctx.htmlName}:`)
      this.logger.getConsola().error(error)
      this.disposeCurrentConnection()
      ctx.serverFunction.dispose?.()
    }
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

  export interface ServerFunction<RemoteFunctions extends WebviewContext.ClientFunction, LocalFunctions extends ServerFunction<RemoteFunctions, LocalFunctions>, T = any> {
    /**
     * Called when the RPC connection is initialized.
     *
     * @param e - The initial callback event.
     */
    onRpcInitialized?(e: InitialCallbackEvent<RemoteFunctions, LocalFunctions, T>): Awaitable<void>
    /**
     * Frontend side will call this function when the framework instance is mounted.
     * This function must only called once.
     */
    onMounted?(): Awaitable<unknown>
    /**
     * Called when the webview panel is disposed.
     */
    dispose?(): void
  }
}
