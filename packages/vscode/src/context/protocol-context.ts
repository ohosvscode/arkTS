import type { Translator } from '../translate'
import { ExtensionLogger } from '@arkts/shared/vscode'
import * as vscode from 'vscode'

export abstract class ProtocolContext extends ExtensionLogger {
  protected abstract readonly translator: Translator

  /**
   * Find all l10n by current language
   */
  findAllL10nByCurrentLanguage(): Promise<Record<string, string>> {
    return this.translator.findAllByCurrentLanguage()
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return vscode.env.language
  }
}
