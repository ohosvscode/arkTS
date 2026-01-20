import type { LanguageServiceContext } from '@volar/language-server'
import type * as ets from 'ohos-typescript'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'

export interface TSProvider {
  'typescript/languageService'(): ets.LanguageService
  'typescript/languageServiceHost'(): ets.LanguageServiceHost
}

/** 一些工具类，用于services中获取一些对象。 */
export class ContextUtil {
  constructor(private readonly context: LanguageServiceContext) {}

  getContext(): LanguageServiceContext {
    return this.context
  }

  /**
   * 获取 volar service 中已有的`LanguageService`对象
   *
   * @description ⚠️ 注意，此方法只能在provide层使用，在create(context)层中使用是拿不到LanguageService对象的！！
   * @returns LanguageService对象，如果获取失败则返回null
   */
  getLanguageService(): ets.LanguageService | null {
    const languageService = this.context.inject<TSProvider>(`typescript/languageService`)
    if (!languageService) return null
    return languageService as ets.LanguageService
  }

  private documentRegistries: [boolean, string, ets.DocumentRegistry][] = []

  getDocumentRegistry(
    ets: typeof import('ohos-typescript'),
    useCaseSensitiveFileNames: boolean,
    currentDirectory: string,
  ): ets.DocumentRegistry {
    let documentRegistry = this.documentRegistries.find(item =>
      item[0] === useCaseSensitiveFileNames && item[1] === currentDirectory,
    )?.[2]
    if (!documentRegistry) {
      documentRegistry = ets.createDocumentRegistry(useCaseSensitiveFileNames, currentDirectory)
      this.documentRegistries.push([useCaseSensitiveFileNames, currentDirectory, documentRegistry])
    }
    return documentRegistry
  }

  private _standaloneLanguageService: ets.LanguageService | null = null

  /**
   * 获取全局独立的 LanguageService。该单例对象并不是从 volar service 中注入进来，而是直接
   * 通过 ohos-typescript 的 `ets.createLanguageService()` 函数创建。
   *
   * @description ⚠️ 注意，此方法只能在provide层使用，在create(context)层中使用是`有可能`拿不到LanguageService对象的。
   * @param ets ohos-typescript 实例
   */
  getStandaloneLanguageService(ets: typeof import('ohos-typescript')): ets.LanguageService | null {
    if (this._standaloneLanguageService) return this._standaloneLanguageService
    if (!this.context.project.typescript?.languageServiceHost) return null
    this._standaloneLanguageService = ets.createLanguageService(
      this.context.project.typescript.languageServiceHost as any,
      this.getDocumentRegistry(
        ets,
        this.context.project.typescript.sys.useCaseSensitiveFileNames,
        this.context.project.typescript.languageServiceHost.getCurrentDirectory(),
      ),
    )
    return this._standaloneLanguageService
  }

  dispose(): void {
    if (this._standaloneLanguageService) {
      this._standaloneLanguageService.dispose()
      this._standaloneLanguageService = null
    }
    this.documentRegistries = []
  }

  getLanguageServiceHost(): ets.LanguageServiceHost | null {
    const languageServiceHost = this.context.inject<TSProvider>(`typescript/languageServiceHost`)
    if (!languageServiceHost) return null
    return languageServiceHost as ets.LanguageServiceHost
  }

  decodeTextDocumentUri(document: TextDocument): URI | null {
    const parsed = URI.parse(document.uri)
    const decoded = this.context.decodeEmbeddedDocumentUri(parsed)
    if (!decoded) return parsed
    const [decodedUri] = decoded
    return decodedUri
  }

  /**
   * 解码`TextDocument`并获取`TS源文件AST`
   *
   * @param document 当前TextDocument对象
   * @returns 源文件AST，如果获取失败则返回null
   */
  decodeSourceFile(document: TextDocument): ets.SourceFile | null {
    const decoded = this.context.decodeEmbeddedDocumentUri(URI.parse(document.uri))
    if (!decoded) return null
    const [decodedUri] = decoded
    const languageService = this.getLanguageService()
    if (!languageService) return null
    const program = languageService.getProgram()
    if (!program) return null
    const sourceFile = program.getSourceFile(decodedUri.fsPath)
    if (!sourceFile) return null
    return sourceFile
  }

  /**
   * 解码`TextDocument`并获取`TS源文件AST`。
   *
   * 该方法获取到的是开始解析时的原始TS源文件AST (Powered by `ts-macro`)
   *
   * @param document 当前 `TextDocument` 对象
   * @param ets 如果不传则不完整校验获取到的到底是否是一个正确的 {@linkcode ets.SourceFile} 对象
   * @returns 如果获取失败则返回 `null`
   */
  getOriginalSourceFile(document: TextDocument, ets?: typeof import('ohos-typescript')): ets.SourceFile | null {
    const decoded = this.context.decodeEmbeddedDocumentUri(URI.parse(document.uri))
    if (!decoded) return null
    const [decodedUri, embeddedCodeId] = decoded
    const virtualCode = this.context.language.scripts.get(decodedUri)?.generated?.embeddedCodes.get(embeddedCodeId)
    if (!virtualCode || !('ast' in virtualCode) || typeof virtualCode.ast !== 'object' || virtualCode.ast === null) return null
    if (ets && !ets.isSourceFile(virtualCode.ast as ets.Node)) return null
    return virtualCode.ast as ets.SourceFile
  }

  getWorkspaceFolderForDocument(uri: string, workspaceFolders: URI[] = this.context.env.workspaceFolders): string | undefined {
    if (!workspaceFolders?.length) return undefined

    const docUri = URI.parse(uri)
    const matches = workspaceFolders
      .map(folder => ({
        folder,
        matchLength: docUri.toString().startsWith(folder.toString())
          ? folder.toString().length
          : 0,
      }))
      .filter(m => m.matchLength > 0)
      .sort((a, b) => b.matchLength - a.matchLength)

    return matches[0]?.folder.toString()
  }
}
