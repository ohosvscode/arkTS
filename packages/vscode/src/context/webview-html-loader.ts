import type { FileSystemContext } from './file-system-context'
import { ExtensionLogger } from '@arkts/shared/vscode'
import * as vscode from 'vscode'

export interface WebviewContainer {
  webview: vscode.Webview
  onDidDispose(callback: () => void): void
}

export class WebviewHtmlLoader<Container extends WebviewContainer = WebviewContainer> extends ExtensionLogger {
  constructor(
    private readonly fsx: FileSystemContext,
    private readonly extensionUri: vscode.Uri,
    private readonly webviewContainer: Container,
    private readonly htmlName: string,
    private readonly initialURL?: string,
  ) {
    super()
  }

  private buildUri = vscode.Uri.joinPath(this.extensionUri, 'build')
  private htmlUri = vscode.Uri.joinPath(this.buildUri, this.htmlName)

  getBuildUri(): vscode.Uri {
    return this.buildUri
  }

  getHtmlUri(): vscode.Uri {
    return this.htmlUri
  }

  private async loadHtml(): Promise<void> {
    const content = (await this.fsx.readFileToString(this.htmlUri)).replace(/\{\{(.*?)\}\}/g, (_, href) => {
      const resourceUri = this.webviewContainer.webview.asWebviewUri(vscode.Uri.joinPath(this.getBuildUri(), href?.trim?.() || href))
      return decodeURIComponent(resourceUri?.toString() || '')
    }).replace(/<head>/, `<head>${this.initialURL ? `<script>window.INITIAL_URL = ${JSON.stringify(this.initialURL)}</script>` : ''}`)
    this.webviewContainer.webview.html = content
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
