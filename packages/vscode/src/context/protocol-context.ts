import type { Translator } from 'unioc/vscode'
import type { InitialCallbackEvent, WebviewContext } from './webview-context'
import { ExtensionLogger } from '@arkts/shared/vscode'
import * as vscode from 'vscode'

export abstract class ProtocolContext<RemoteFunctions extends WebviewContext.ClientFunction, LocalFunctions extends WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions>, T = any> extends ExtensionLogger implements WebviewContext.ServerFunction<RemoteFunctions, LocalFunctions, T> {
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

  onRpcInitialized(e: InitialCallbackEvent<RemoteFunctions, LocalFunctions>): void {
    this.extensionContext.subscriptions.push(
      vscode.window.onDidChangeActiveColorTheme(() => {
        e.connection.onDidChangeActiveColorTheme()
      }),
    )
    this.getConsola().info(`RPC functions initialized for protocol context ${this.constructor.name}.`)
  }

  onMounted(): void {
    this.getConsola().warn(`Protocol context ${this.constructor.name} is mounted.`)
  }
}
