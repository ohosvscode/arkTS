import type { LanguageServicePlugin } from '@volar/language-server'
import type { Diagnostic } from '@volar/language-server/node'
import type * as ets from 'ohos-typescript'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import type { LanguageServerConfigManager } from '../classes/config-manager'
import type { GlobalRawfileCallInfo } from '../classes/global-call-expression-finder'
import { parseRawfileReference } from '@arkts/shared'
import { DiagnosticSeverity, Range } from '@volar/language-server/node'
import { BaseResourceService } from '../classes/base-resource-service'
import { ResourceResolverManager } from '../classes/resource-resolver'
import { logger } from '../logger'
import { ContextUtil } from '../utils/finder'

/**
 * Rawfile资源诊断级别
 */
export type RawfileDiagnosticLevel = 'error' | 'warning' | 'none'

/**
 * Rawfile资源诊断服务
 * 检测和诊断$rawfile()调用中的资源引用问题
 */
export class RawfileDiagnosticService extends BaseResourceService {
  constructor(
    private lspConfiguration: LanguageServerConfigManager,
    private projectRoot: string,
    private getDiagnosticLevel: () => RawfileDiagnosticLevel,
  ) {
    super()
  }

  private readonly resourceResolverManager = ResourceResolverManager.getInstance()

  /**
   * 提供rawfile资源诊断
   */
  async provideDiagnostics(document: TextDocument, sourceFile: ets.SourceFile): Promise<Diagnostic[]> {
    try {
      this.info('provideDiagnostics', { uri: document.uri })

      // 检查诊断级别
      const diagnosticLevel = this.getDiagnosticLevel()
      if (diagnosticLevel === 'none') {
        return []
      }

      // 查找所有 $rawfile() 调用
      const rawfileCalls = await this.findAllRawfileCalls(sourceFile)
      if (rawfileCalls.length === 0) {
        return []
      }

      this.info('Found $rawfile() calls', { count: rawfileCalls.length })

      // 确保资源解析器已初始化
      if (!this.resourceResolverManager.ensureInitialized(this.lspConfiguration)) {
        this.error('Resource resolver not available', null)
        return []
      }

      const diagnostics: Diagnostic[] = []

      for (const rawfileCall of rawfileCalls) {
        const diagnostic = await this.createRawfileDiagnostic(document, rawfileCall, diagnosticLevel)
        if (diagnostic) {
          diagnostics.push(diagnostic)
        }
      }

      this.info('Generated diagnostics', { count: diagnostics.length })
      return diagnostics
    }
    catch (error) {
      this.error('Error in provideDiagnostics', error)
      return []
    }
  }

  /**
   * 为rawfile调用创建诊断信息
   */
  private async createRawfileDiagnostic(
    document: TextDocument,
    rawfileCall: GlobalRawfileCallInfo,
    diagnosticLevel: RawfileDiagnosticLevel,
  ): Promise<Diagnostic | null> {
    try {
      // 解析rawfile引用
      const rawfileRef = parseRawfileReference(rawfileCall.resourceValue)
      if (!rawfileRef) {
        return this.createDiagnostic(
          document,
          rawfileCall,
          `Failed to parse rawfile reference '${rawfileCall.resourceValue}': invalid syntax`,
          diagnosticLevel,
        )
      }

      // 解析rawfile位置
      const rawfileLocation = await this.resourceResolverManager.getResolver()!.resolveRawfileReference(rawfileCall.resourceValue)
      if (!rawfileLocation) {
        return this.createDiagnostic(
          document,
          rawfileCall,
          `Rawfile resource '${rawfileRef.filePath}' not found in project`,
          diagnosticLevel,
        )
      }

      // rawfile资源存在，无需诊断
      return null
    }
    catch (error) {
      this.error('Error creating rawfile diagnostic', error)
      return this.createDiagnostic(
        document,
        rawfileCall,
        `Error validating rawfile resource '${rawfileCall.resourceValue}'`,
        diagnosticLevel,
      )
    }
  }

  /**
   * 创建诊断信息对象
   */
  private createDiagnostic(
    document: TextDocument,
    rawfileCall: GlobalRawfileCallInfo,
    message: string,
    diagnosticLevel: RawfileDiagnosticLevel,
  ): Diagnostic {
    const severity = this.getDiagnosticSeverity(diagnosticLevel)

    // 计算诊断范围 - 定位到资源字符串部分
    const startPos = document.positionAt(rawfileCall.resourceStart)
    const endPos = document.positionAt(rawfileCall.resourceEnd)

    return {
      range: Range.create(startPos, endPos),
      severity,
      message,
      source: 'arkts-rawfile-diagnostic',
    }
  }

  /**
   * 获取诊断严重程度
   */
  private getDiagnosticSeverity(level: RawfileDiagnosticLevel): DiagnosticSeverity {
    switch (level) {
      case 'error':
        return DiagnosticSeverity.Error
      case 'warning':
        return DiagnosticSeverity.Warning
      default:
        return DiagnosticSeverity.Error
    }
  }
}

/**
 * 创建集成的rawfile资源诊断服务
 */
export function createETSRawfileDiagnosticService(
  lspConfiguration: LanguageServerConfigManager,
  projectRoot: string,
  getDiagnosticLevel: () => RawfileDiagnosticLevel,
): LanguageServicePlugin {
  logger.getConsola().info('Creating rawfile diagnostic service with project root:', projectRoot)

  // 设置项目根并尝试初始化资源解析器
  ResourceResolverManager.getInstance().setProjectRoot(projectRoot)
  ResourceResolverManager.getInstance().initialize(lspConfiguration)

  // 创建服务实例
  const service = new RawfileDiagnosticService(lspConfiguration, projectRoot, getDiagnosticLevel)

  return {
    name: 'arkts-rawfile-diagnostic',
    capabilities: {
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
    },
    create(context) {
      return {
        async provideDiagnostics(document: TextDocument): Promise<Diagnostic[]> {
          const sourceFile = new ContextUtil(context).decodeSourceFile(document)
          if (!sourceFile) {
            return []
          }
          return service.provideDiagnostics(document, sourceFile)
        },
      }
    },
  }
}
