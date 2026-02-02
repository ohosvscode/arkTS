import type { BirpcReturn } from 'birpc'
import type { Translator } from 'unioc/vscode'
import type { WebviewContext } from './webview-context'
import { ExtensionLogger } from '@arkts/shared/vscode'
import * as vscode from 'vscode'

export abstract class ProtocolContext<RemoteFunctions extends WebviewContext.ClientFunction, LocalFunctions extends WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>> extends ExtensionLogger implements WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions> {
  protected abstract readonly translator: Translator
  protected abstract readonly extensionContext: vscode.ExtensionContext

  /**
   * Find all l10n by current language
   */
  async findAllL10nByCurrentLanguage(): Promise<Record<string, string>> {
    const localeFilePath = this.translator.getCurrentLocaleFilePath()
    if (!localeFilePath) return {}
    const localeFile = await vscode.workspace.fs.readFile(vscode.Uri.parse(localeFilePath))
    return JSON.parse(localeFile.toString())
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return vscode.env.language
  }

  onRpcInitialized(connection: BirpcReturn<RemoteFunctions, LocalFunctions>, _context: WebviewContext<RemoteFunctions, LocalFunctions>): void {
    this.extensionContext.subscriptions.push(
      vscode.window.onDidChangeActiveColorTheme(() => {
        connection.onDidChangeActiveColorTheme()
      }),
    )
  }
}
