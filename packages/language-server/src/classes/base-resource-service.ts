import type { Position } from '@volar/language-server/node'
import type * as ets from 'ohos-typescript'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import type { GlobalRCallInfo, GlobalRawfileCallInfo } from './global-call-expression-finder'
import { logger } from '../logger'
import { GlobalRCallFinder } from './global-call-expression-finder'

/**
 * 资源服务基类
 * 提供通用的 $r() 和 $rawfile() 调用查找和分析功能
 */
export abstract class BaseResourceService {
  protected finder?: GlobalRCallFinder
  protected ets?: typeof import('ohos-typescript')

  constructor() {
    this.initializeEts()
  }

  /**
   * 初始化 ohos-typescript
   */
  private async initializeEts(): Promise<void> {
    if (!this.ets) {
      this.ets = await import('ohos-typescript')
      this.finder = new GlobalRCallFinder(this.ets)
    }
  }

  /**
   * 确保 ETS 和查找器已初始化
   */
  protected async ensureInitialized(): Promise<boolean> {
    if (!this.ets || !this.finder) {
      await this.initializeEts()
    }
    return !!(this.ets && this.finder)
  }

  /**
   * 查找文档中所有的 $r() 调用
   */
  protected async findAllResourceCalls(sourceFile: ets.SourceFile): Promise<GlobalRCallInfo[]> {
    if (!(await this.ensureInitialized())) {
      logger.getConsola().warn('Failed to initialize ETS for resource call finding')
      return []
    }

    try {
      return this.finder!.findGlobalRCallsSimple(sourceFile)
    }
    catch (error) {
      logger.getConsola().warn('Failed to find resource calls:', error)
      return []
    }
  }

  /**
   * 查找指定位置的 $r() 调用
   */
  protected async findResourceCallAtPosition(document: TextDocument, position: Position, sourceFile: ets.SourceFile): Promise<GlobalRCallInfo | null> {
    const calls = await this.findAllResourceCalls(sourceFile)
    const offset = document.offsetAt(position)
    return calls.find(call => offset >= call.resourceStart && offset <= call.resourceEnd) || null
  }

  /**
   * 记录服务操作日志
   */
  protected info(operation: string, details?: any): void {
    logger.getConsola().info(`[${this.constructor.name}] ${operation}`, JSON.stringify(details))
  }

  /**
   * 记录错误日志
   */
  protected error(operation: string, error: any): void {
    logger.getConsola().error(`[${this.constructor.name}] ${operation}:`, error)
  }

  /**
   * 查找文档中所有的 $rawfile() 调用
   */
  protected async findAllRawfileCalls(sourceFile: ets.SourceFile): Promise<GlobalRawfileCallInfo[]> {
    if (!(await this.ensureInitialized())) {
      logger.getConsola().warn('Failed to initialize ETS for rawfile call finding')
      return []
    }

    try {
      return this.finder!.findGlobalRawfileCalls(sourceFile)
    }
    catch (error) {
      logger.getConsola().warn('Failed to find rawfile calls:', error)
      return []
    }
  }

  /**
   * 查找指定位置的 $rawfile() 调用
   */
  protected async findRawfileCallAtPosition(document: TextDocument, position: Position, sourceFile: ets.SourceFile): Promise<GlobalRawfileCallInfo | null> {
    const calls = await this.findAllRawfileCalls(sourceFile)
    const offset = document.offsetAt(position)
    return calls.find(call => offset >= call.resourceStart && offset <= call.resourceEnd) || null
  }
}
