import * as vscode from 'vscode'

export default class AutoSetLanguage {
  constructor(private readonly context: vscode.ExtensionContext) {
    vscode.workspace.textDocuments.forEach(document => this.autoSetArkTSLanguage(document))
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(document => this.autoSetArkTSLanguage(document)))
  }

  private isContainsInUri(uri: vscode.Uri, sdkPath: string): boolean {
    return uri.toString().startsWith(sdkPath)
      || uri.toString().startsWith(vscode.Uri.file(sdkPath).toString())
      || uri.toString().startsWith(vscode.Uri.parse(sdkPath).toString())
  }

  private autoSetArkTSLanguage(document: vscode.TextDocument): void {
    if (!(document.uri.toString().endsWith('.ets')) && !(document.uri.toString().endsWith('.ts'))) return
    const sdkPath = vscode.workspace.getConfiguration('ets').get<string>('sdkPath')
    if (!sdkPath) return
    if (!this.isContainsInUri(document.uri, sdkPath) && !this.isContainsInUri(document.uri, vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'lib').toString())) return
    vscode.languages.setTextDocumentLanguage(document, 'arkts')
  }
}
