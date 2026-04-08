import type { FileSystemContext } from './file-system-context'
import type { AttachWebviewContext, WebviewContext } from './webview-context'
import { ExtensionLogger } from '@arkts/shared/vscode'
import * as vscode from 'vscode'

export interface WebviewContainer {
  webview: vscode.Webview
  onDidDispose(callback: () => void): vscode.Disposable
}

export class WebviewHtmlLoader<RemoteFunctions extends WebviewContext.ClientFunction, LocalFunctions extends WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>, Container extends WebviewContainer = WebviewContainer> extends ExtensionLogger {
  constructor(
    private readonly fsx: FileSystemContext,
    private readonly ctx: AttachWebviewContext<RemoteFunctions, LocalFunctions, Container>,
  ) {
    super()
  }

  private buildUri = vscode.Uri.joinPath(this.ctx.extensionUri, 'build')
  private htmlUri = vscode.Uri.joinPath(this.buildUri, this.ctx.htmlName)

  getBuildUri(): vscode.Uri {
    return this.buildUri
  }

  getHtmlUri(): vscode.Uri {
    return this.htmlUri
  }

  private async loadHtml(): Promise<void> {
    const content = (await this.fsx.readFileToString(this.htmlUri)).replace(/\{\{(.*?)\}\}/g, (_, href) => {
      const resourceUri = this.ctx.webviewContainer.webview.asWebviewUri(vscode.Uri.joinPath(this.getBuildUri(), href?.trim?.() || href))
      return decodeURIComponent(resourceUri?.toString() || '')
    }).replace(/<head>/, `<head>${this.ctx.initialURL ? `<script>window.INITIAL_URL = ${JSON.stringify(this.ctx.initialURL)}</script>` : ''}`)
    this.ctx.webviewContainer.webview.html = content
  }

  public async createHtmlWatcher(): Promise<vscode.Disposable> {
    await this.loadHtml()
    const relativePattern = new vscode.RelativePattern(this.buildUri, '**/*')
    const fsWatcher = vscode.workspace.createFileSystemWatcher(relativePattern)
    this.getConsola().info(`WebviewHtmlLoader created html watcher for ${relativePattern.baseUri.fsPath} -> ${relativePattern.pattern}`)
    const onDidChangeDisposable = fsWatcher.onDidChange(() => this.loadHtml())
    const onDidAddDisposable = fsWatcher.onDidCreate(() => this.loadHtml())

    return new vscode.Disposable(() => {
      onDidChangeDisposable.dispose()
      onDidAddDisposable.dispose()
      fsWatcher.dispose()
    })
  }
}
