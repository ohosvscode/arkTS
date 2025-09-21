import type { LanguageServicePlugin, LocationLink } from '@volar/language-server'
import type * as ets from 'ohos-typescript'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import type { LanguageServerConfigManager } from '../classes/config-manager'
import { parseRawfileReference } from '@arkts/shared'
import { Position, Range } from '@volar/language-server/node'
import { URI } from 'vscode-uri'
import { BaseResourceService } from '../classes/base-resource-service'
import { ResourceResolverManager } from '../classes/resource-resolver'
import { logger } from '../logger'
import { ContextUtil } from '../utils/finder'

/**
 * Rawfile资源定义服务
 */
export class RawfileDefinitionService extends BaseResourceService {
  constructor(private lspConfiguration: LanguageServerConfigManager) {
    super()
  }

  private readonly resourceResolverManager = ResourceResolverManager.getInstance()

  /**
   * 提供rawfile资源定义跳转
   */
  async provideDefinition(document: TextDocument, position: Position, sourceFile: ets.SourceFile): Promise<LocationLink[] | null> {
    try {
      this.info('provideDefinition', { uri: document.uri, position })

      // 查找当前位置的 $rawfile() 调用
      const rawfileCall = await this.findRawfileCallAtPosition(document, position, sourceFile)
      if (!rawfileCall)
        return null

      this.info('Found $rawfile() call', rawfileCall)

      // 解析rawfile引用
      const rawfileRef = parseRawfileReference(rawfileCall.resourceValue)
      if (!rawfileRef) {
        this.error('Failed to parse rawfile reference', rawfileCall.resourceValue)
        return null
      }

      this.info('Parsed rawfile reference', rawfileRef)

      // 确保资源解析器已初始化
      if (!this.resourceResolverManager.ensureInitialized(this.lspConfiguration)) {
        this.error('Resource resolver not available', null)
        return null
      }

      // 解析rawfile位置
      const rawfileLocation = await this.resourceResolverManager.getResolver()!.resolveRawfileReference(rawfileCall.resourceValue)
      if (!rawfileLocation) {
        this.info('Rawfile not found', rawfileCall.resourceValue)
        return null
      }

      this.info('Found rawfile location', rawfileLocation)

      // 构建跳转位置
      const targetRange = {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      }

      const originSelectionRange = Range.create(
        Position.create(
          position.line,
          rawfileCall.resourceStart - document.offsetAt({ line: position.line, character: 0 }),
        ),
        Position.create(
          position.line,
          rawfileCall.resourceEnd - document.offsetAt({ line: position.line, character: 0 }),
        ),
      )

      const result: LocationLink[] = [{
        targetUri: rawfileLocation.uri,
        targetRange,
        targetSelectionRange: targetRange,
        originSelectionRange,
      }]

      this.info('Returning location link', result)
      return result
    }
    catch (error) {
      this.error('Error in provideDefinition', error)
      return null
    }
  }
}

/**
 * 创建集成的rawfile资源定义跳转服务
 */
export function createETSIntegratedRawfileDefinitionService(projectRoot: string, lspConfiguration: LanguageServerConfigManager): LanguageServicePlugin {
  logger.getConsola().info('Creating integrated rawfile definition service with project root:', projectRoot)

  // 清理项目根路径（移除 file:// 前缀）
  const cleanProjectRoot = projectRoot.startsWith('file://')
    ? URI.parse(projectRoot).fsPath
    : projectRoot

  logger.getConsola().info('Cleaned project root:', cleanProjectRoot)

  // 设置项目根并尝试初始化资源解析器
  ResourceResolverManager.getInstance().setProjectRoot(cleanProjectRoot)
  ResourceResolverManager.getInstance().initialize(lspConfiguration)

  // 创建服务实例
  const service = new RawfileDefinitionService(lspConfiguration)

  return {
    name: 'arkts-rawfile-definition-integrated',
    capabilities: {
      definitionProvider: true,
    },
    create(context) {
      return {
        async provideDefinition(document: TextDocument, position: Position): Promise<LocationLink[] | null> {
          const sourceFile = new ContextUtil(context).decodeSourceFile(document)
          if (!sourceFile)
            return null
          return service.provideDefinition(document, position, sourceFile)
        },
      }
    },
  }
}
