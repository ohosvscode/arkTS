import type { LanguageServiceContext } from '@volar/language-server'
import type * as ets from 'ohos-typescript'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import { Uri } from '@vstils/core'

export interface TSProvider {
  'typescript/languageService'(): ets.LanguageService
}

/** 一些工具类，用于services中获取一些对象。 */
export class ContextUtil {
  constructor(private readonly context: LanguageServiceContext) {}

  /**
   * 获取已有的`LanguageService`对象
   *
   * @description ⚠️ 注意，此方法只能在provide层使用，在create(context)层中使用是拿不到LanguageService对象的！！
   * @returns LanguageService对象，如果获取失败则返回null
   */
  getLanguageService(): ets.LanguageService | null {
    const languageService = this.context.inject<TSProvider>(`typescript/languageService`)
    if (!languageService) return null
    return languageService
  }

  /**
   * 解码`TextDocument`并获取`TS源文件AST`
   *
   * @param document 当前TextDocument对象
   * @returns 源文件AST，如果获取失败则返回null
   */
  decodeSourceFile(document: TextDocument): ets.SourceFile | null {
    const decoded = this.context.decodeEmbeddedDocumentUri(Uri.parse(document.uri))
    if (!decoded) return null
    const [decodedUri] = decoded
    const languageService = this.context.inject<TSProvider>(`typescript/languageService`)
    if (!languageService) return null
    const program = languageService.getProgram()
    if (!program) return null
    const sourceFile = program.getSourceFile(decodedUri.fsPath)
    if (!sourceFile) return null
    return sourceFile
  }
}
