import type { RawfileIndexItem } from '@arkts/shared'
import type { LanguageServicePlugin } from '@volar/language-service'
import type { CompletionItem, Position, TextDocument } from 'vscode-languageserver'
import type { LanguageServerConfigManager } from '../classes/config-manager'
import { CompletionItemKind } from 'vscode-languageserver'
import { ResourceResolverManager } from '../classes/resource-resolver'
import { logger } from '../logger'

/**
 * Rawfile补全上下文
 */
interface RawfileCompletionContext {
  currentInput: string
  startPosition: Position
  isInRawfileCall: boolean
  prefix: string
  cursorPositionInResource?: number
}

/**
 * 文件类型定义
 */
interface FileTypeInfo {
  kind: CompletionItemKind
  detail: string
  description: string
  icon?: string
  priority: number // 优先级（1-10，数字越大优先级越高）
}

/**
 * 支持的文件类型映射（带优先级）
 */
const FILE_TYPE_MAP: Record<string, FileTypeInfo> = {
  // 图片文件（高优先级）
  '.png': { kind: CompletionItemKind.File, detail: 'PNG Image', description: 'Portable Network Graphics image file', icon: '🖼️', priority: 9 },
  '.jpg': { kind: CompletionItemKind.File, detail: 'JPEG Image', description: 'JPEG image file', icon: '🖼️', priority: 9 },
  '.jpeg': { kind: CompletionItemKind.File, detail: 'JPEG Image', description: 'JPEG image file', icon: '🖼️', priority: 9 },
  '.gif': { kind: CompletionItemKind.File, detail: 'GIF Image', description: 'Graphics Interchange Format image', icon: '🖼️', priority: 8 },
  '.svg': { kind: CompletionItemKind.File, detail: 'SVG Image', description: 'Scalable Vector Graphics image', icon: '🖼️', priority: 8 },
  '.webp': { kind: CompletionItemKind.File, detail: 'WebP Image', description: 'WebP image file', icon: '🖼️', priority: 7 },
  '.bmp': { kind: CompletionItemKind.File, detail: 'Bitmap Image', description: 'Bitmap image file', icon: '🖼️', priority: 6 },
  '.ico': { kind: CompletionItemKind.File, detail: 'Icon File', description: 'Icon file', icon: '🖼️', priority: 7 },

  // 音频文件（中等优先级）
  '.mp3': { kind: CompletionItemKind.File, detail: 'MP3 Audio', description: 'MP3 audio file', icon: '🎧', priority: 8 },
  '.wav': { kind: CompletionItemKind.File, detail: 'WAV Audio', description: 'WAV audio file', icon: '🎧', priority: 7 },
  '.ogg': { kind: CompletionItemKind.File, detail: 'OGG Audio', description: 'OGG audio file', icon: '🎧', priority: 6 },
  '.aac': { kind: CompletionItemKind.File, detail: 'AAC Audio', description: 'AAC audio file', icon: '🎧', priority: 7 },
  '.flac': { kind: CompletionItemKind.File, detail: 'FLAC Audio', description: 'FLAC audio file', icon: '🎧', priority: 6 },

  // 视频文件（中等优先级）
  '.mp4': { kind: CompletionItemKind.File, detail: 'MP4 Video', description: 'MP4 video file', icon: '🎥', priority: 8 },
  '.avi': { kind: CompletionItemKind.File, detail: 'AVI Video', description: 'AVI video file', icon: '🎥', priority: 6 },
  '.mov': { kind: CompletionItemKind.File, detail: 'MOV Video', description: 'MOV video file', icon: '🎥', priority: 7 },
  '.wmv': { kind: CompletionItemKind.File, detail: 'WMV Video', description: 'WMV video file', icon: '🎥', priority: 5 },
  '.mkv': { kind: CompletionItemKind.File, detail: 'MKV Video', description: 'MKV video file', icon: '🎥', priority: 6 },

  // 文档文件（中等优先级）
  '.txt': { kind: CompletionItemKind.File, detail: 'Text File', description: 'Plain text file', icon: '📄', priority: 6 },
  '.pdf': { kind: CompletionItemKind.File, detail: 'PDF Document', description: 'PDF document file', icon: '📄', priority: 7 },
  '.doc': { kind: CompletionItemKind.File, detail: 'Word Document', description: 'Microsoft Word document', icon: '📄', priority: 5 },
  '.docx': { kind: CompletionItemKind.File, detail: 'Word Document', description: 'Microsoft Word document', icon: '📄', priority: 5 },
  '.rtf': { kind: CompletionItemKind.File, detail: 'RTF Document', description: 'Rich Text Format document', icon: '📄', priority: 4 },

  // 数据文件（中等优先级）
  '.json': { kind: CompletionItemKind.File, detail: 'JSON Data', description: 'JSON data file', icon: '📊', priority: 7 },
  '.xml': { kind: CompletionItemKind.File, detail: 'XML Data', description: 'XML data file', icon: '📊', priority: 6 },
  '.csv': { kind: CompletionItemKind.File, detail: 'CSV Data', description: 'Comma-separated values file', icon: '📊', priority: 6 },
  '.yaml': { kind: CompletionItemKind.File, detail: 'YAML Data', description: 'YAML data file', icon: '📊', priority: 5 },
  '.yml': { kind: CompletionItemKind.File, detail: 'YAML Data', description: 'YAML data file', icon: '📊', priority: 5 },

  // 字体文件（低优先级）
  '.ttf': { kind: CompletionItemKind.File, detail: 'TrueType Font', description: 'TrueType font file', icon: '🅰️', priority: 4 },
  '.otf': { kind: CompletionItemKind.File, detail: 'OpenType Font', description: 'OpenType font file', icon: '🅰️', priority: 4 },
  '.woff': { kind: CompletionItemKind.File, detail: 'Web Font', description: 'Web Open Font Format file', icon: '🅰️', priority: 3 },
  '.woff2': { kind: CompletionItemKind.File, detail: 'Web Font 2', description: 'Web Open Font Format 2 file', icon: '🅰️', priority: 3 },

  // 其他常见文件（低优先级）
  '.zip': { kind: CompletionItemKind.File, detail: 'Archive File', description: 'ZIP archive file', icon: '🗇', priority: 3 },
  '.rar': { kind: CompletionItemKind.File, detail: 'Archive File', description: 'RAR archive file', icon: '🗇', priority: 3 },
  '.7z': { kind: CompletionItemKind.File, detail: 'Archive File', description: '7-Zip archive file', icon: '🗇', priority: 3 },
  '.tar': { kind: CompletionItemKind.File, detail: 'Archive File', description: 'TAR archive file', icon: '🗇', priority: 2 },
  '.gz': { kind: CompletionItemKind.File, detail: 'Archive File', description: 'GZIP archive file', icon: '🗇', priority: 2 },
}

/**
 * Rawfile补全上下文分析器
 */
class RawfileCompletionAnalyzer {
  constructor(private projectRoot: string, private lspConfiguration: LanguageServerConfigManager) {}

  /**
   * 分析rawfile补全上下文
   */
  analyzeContext(document: TextDocument, position: Position): RawfileCompletionContext | null {
    try {
      const line = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: position.character },
      })

      // 查找 $rawfile() 调用的正则表达式
      const rawfileCallPattern = /\$rawfile\s*\(\s*['"`]?([^'"`)]*)$/
      const rawfileCallMatch = line.match(rawfileCallPattern)

      if (!rawfileCallMatch) {
        return null
      }

      const currentInput = rawfileCallMatch[1]
      const startCharacter = line.lastIndexOf('$rawfile(') + 10 // '$rawfile('.length
      const quoteStartIndex = line.includes('"', startCharacter)
        ? line.indexOf('"', startCharacter) + 1
        : line.includes('\'', startCharacter)
          ? line.indexOf('\'', startCharacter) + 1
          : startCharacter

      return {
        currentInput,
        startPosition: { line: position.line, character: quoteStartIndex },
        isInRawfileCall: true,
        prefix: currentInput,
        cursorPositionInResource: currentInput.length,
      }
    }
    catch (error) {
      logger.getConsola().warn('Failed to analyze rawfile completion context:', error)
      return null
    }
  }
}

/**
 * Rawfile补全项生成器
 */
class RawfileCompletionGenerator {
  /**
   * 生成rawfile补全项
   */
  generateItems(context: RawfileCompletionContext, allRawfileResources: RawfileIndexItem[]): CompletionItem[] {
    try {
      // 验证输入参数
      if (!context) {
        logger.getConsola().warn('Invalid context provided to generateItems')
        return []
      }

      const { prefix } = context
      logger.getConsola().info('Generating rawfile items for prefix:', prefix)

      // 获取所有rawfile资源
      const resolver = ResourceResolverManager.getInstance().getResolver()
      if (!resolver) {
        logger.getConsola().warn('ResourceResolver not available')
        return []
      }

      const allRawfileResources = resolver.getAllRawfileResources()

      // 如果前缀为空，提供根目录所有文件和文件夹
      if (!prefix) {
        return this.generateRootItems(allRawfileResources)
      }

      // 分析路径结构
      const isComplete = prefix.endsWith('/')

      if (isComplete) {
        // 完整路径，显示该目录下的内容
        return this.generateDirectoryItems(prefix, allRawfileResources)
      }
      else {
        // 部分输入，进行前缀匹配
        return this.generatePrefixMatchItems(prefix, allRawfileResources)
      }
    }
    catch (error) {
      logger.getConsola().error('Error in generateItems:', error)
      return []
    }
  }

  /**
   * 生成根目录补全项
   */
  private generateRootItems(resources: RawfileIndexItem[]): CompletionItem[] {
    const items: CompletionItem[] = []
    const rootItems = new Set<string>()

    // 找出根目录下的所有文件和文件夹
    resources.forEach((resource) => {
      const path = resource.reference.filePath
      if (!path)
        return

      const firstSegment = path.split('/')[0]

      if (!rootItems.has(firstSegment)) {
        rootItems.add(firstSegment)

        // 判断是文件还是目录
        const isDirectory = resources.some((r) => {
          const rPath = r.reference.filePath
          return rPath && rPath.startsWith(`${firstSegment}/`)
        }) || resource.location.fileType === 'directory'

        items.push(this.createCompletionItem(firstSegment, isDirectory))
      }
    })

    return this.sortCompletionItems(items)
  }

  /**
   * 生成目录内容补全项
   */
  private generateDirectoryItems(directoryPath: string, resources: RawfileIndexItem[]): CompletionItem[] {
    const items: CompletionItem[] = []
    const normalizedPath = directoryPath.replace(/\/$/, '') // 移除末尾斜杠
    const addedItems = new Set<string>()

    resources.forEach((resource) => {
      const path = resource.reference.filePath
      if (!path)
        return

      // 检查是否在指定目录下
      if (path.startsWith(`${normalizedPath}/`)) {
        const relativePath = path.substring(normalizedPath.length + 1)
        const nextSegment = relativePath.split('/')[0]

        // 避免重复添加
        if (!addedItems.has(nextSegment)) {
          addedItems.add(nextSegment)
          const isDirectory = relativePath.includes('/')

          items.push(this.createCompletionItem(nextSegment, isDirectory))
        }
      }
    })

    return this.sortCompletionItems(items)
  }

  /**
   * 生成前缀匹配补全项（智能过滤增强版）
   */
  private generatePrefixMatchItems(prefix: string, resources: RawfileIndexItem[]): CompletionItem[] {
    const items: CompletionItem[] = []
    const pathSegments = prefix.split('/')
    const lastSegment = pathSegments[pathSegments.length - 1]
    const parentPath = pathSegments.slice(0, -1).join('/')
    const addedItems = new Set<string>()

    // 收集候选项
    const candidates: Array<{ item: string, isDirectory: boolean, score: number }> = []

    resources.forEach((resource) => {
      const path = resource.reference.filePath
      if (!path)
        return

      // 如果有父路径，先检查是否匹配
      if (parentPath && !path.startsWith(`${parentPath}/`)) {
        return
      }

      const relativePath = parentPath ? path.substring(parentPath.length + 1) : path
      const firstSegment = relativePath.split('/')[0]

      if (!addedItems.has(firstSegment)) {
        addedItems.add(firstSegment)
        const isDirectory = relativePath.includes('/')
        const score = this.calculateMatchScore(firstSegment, lastSegment)

        if (score > 0) {
          candidates.push({ item: firstSegment, isDirectory, score })
        }
      }
    })

    // 按分数排序，分数高的优先
    candidates.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score // 分数高的在前
      }
      // 分数相同时，目录优先
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1
      }
      // 最后按字母顺序
      return a.item.localeCompare(b.item)
    })

    // 转换为补全项
    candidates.forEach((candidate) => {
      items.push(this.createCompletionItem(candidate.item, candidate.isDirectory, candidate.score))
    })

    return items
  }

  /**
   * 计算匹配分数（智能匹配算法）
   */
  private calculateMatchScore(fileName: string, prefix: string): number {
    if (!prefix)
      return 1 // 空前缀匹配所有

    const fileNameLower = fileName.toLowerCase()
    const prefixLower = prefix.toLowerCase()

    // 精确匹配（最高分）
    if (fileNameLower === prefixLower)
      return 100

    // 前缀匹配（高分）
    if (fileNameLower.startsWith(prefixLower)) {
      // 前缀匹配的分数与匹配长度成正比
      return 80 + (prefixLower.length / fileNameLower.length) * 20
    }

    // 包含匹配（中等分）
    if (fileNameLower.includes(prefixLower)) {
      const index = fileNameLower.indexOf(prefixLower)
      // 越靠前分数越高
      return 50 - index * 2
    }

    // 模糊匹配（首字母匹配）
    if (this.fuzzyMatch(fileNameLower, prefixLower)) {
      return 30
    }

    // 无匹配
    return 0
  }

  /**
   * 模糊匹配算法（首字母缩写匹配）
   */
  private fuzzyMatch(text: string, pattern: string): boolean {
    let textIndex = 0
    let patternIndex = 0

    while (textIndex < text.length && patternIndex < pattern.length) {
      if (text[textIndex] === pattern[patternIndex]) {
        patternIndex++
      }
      textIndex++
    }

    return patternIndex === pattern.length
  }

  /**
   * 创建补全项（增强文件类型识别和显示信息）
   */
  private createCompletionItem(label: string, isDirectory: boolean, score?: number): CompletionItem {
    let kind: CompletionItemKind
    let detail: string
    let documentation: string
    let icon = ''

    if (isDirectory) {
      kind = CompletionItemKind.Folder
      detail = 'Directory'
      documentation = `📁 **Directory**: ${label}\n\n点击可查看目录内容`
      icon = '📁 '
    }
    else {
      // 获取文件扩展名
      const ext = this.getFileExtension(label)
      const fileTypeInfo = FILE_TYPE_MAP[ext]

      if (fileTypeInfo) {
        kind = fileTypeInfo.kind
        detail = `${fileTypeInfo.detail}${score ? ` (匹配度: ${score}%)` : ''}`
        documentation = this.generateFileDocumentation(label, fileTypeInfo, score)
        icon = fileTypeInfo.icon ? `${fileTypeInfo.icon} ` : '📄 '
      }
      else {
        kind = CompletionItemKind.File
        detail = `File${score ? ` (匹配度: ${score}%)` : ''}`
        documentation = `📄 **File**: ${label}\n\n未知文件类型`
        icon = '📄 '
      }
    }

    const item: CompletionItem = {
      label: icon + label, // 在标签前添加图标
      kind,
      detail,
      documentation,
      sortText: this.generateSortText(label, isDirectory, score),
      filterText: label, // 使用原始标签进行过滤
    }

    // 如果是目录，添加 '/' 到插入文本
    if (isDirectory) {
      item.insertText = `${label}/`
    }
    else {
      item.insertText = label
    }

    return item
  }

  /**
   * 生成文件文档信息
   */
  private generateFileDocumentation(fileName: string, fileTypeInfo: FileTypeInfo, score?: number): string {
    let doc = `${fileTypeInfo.icon || '📄'} **${fileTypeInfo.detail}**: ${fileName}\n\n`
    doc += `${fileTypeInfo.description}\n\n`

    if (score) {
      doc += `🎯 **匹配度**: ${score}%\n`
    }

    // 添加优先级信息
    if (fileTypeInfo.priority >= 8) {
      doc += `⭐ **高优先级文件类型**\n`
    }
    else if (fileTypeInfo.priority >= 6) {
      doc += `🔸 **常用文件类型**\n`
    }

    // 添加使用提示
    const ext = this.getFileExtension(fileName)
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext)) {
      doc += `\n💡 **提示**: 适用于应用界面和图标显示`
    }
    else if (['.mp3', '.wav', '.ogg'].includes(ext)) {
      doc += `\n💡 **提示**: 适用于应用音效和背景音乐`
    }
    else if (['.mp4', '.avi', '.mov'].includes(ext)) {
      doc += `\n💡 **提示**: 适用于视频播放和动画显示`
    }
    else if (['.json', '.xml', '.csv'].includes(ext)) {
      doc += `\n💡 **提示**: 可用于应用配置和数据存储`
    }

    return doc
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.')
    if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
      return ''
    }
    return fileName.substring(lastDotIndex).toLowerCase()
  }

  /**
   * 生成排序文本（智能排序增强版）
   */
  private generateSortText(label: string, isDirectory: boolean, score?: number): string {
    const sortParts: string[] = []

    if (score !== undefined) {
      // 使用分数进行排序（分数高的在前）
      const scorePrefix = String(1000 - score).padStart(4, '0')
      sortParts.push(scorePrefix)
    }
    else {
      // 默认分数
      sortParts.push('0500')
    }

    if (isDirectory) {
      // 目录始终排在最前
      sortParts.push('0')
      sortParts.push(label.toLowerCase())
    }
    else {
      // 文件按类型优先级排序
      const ext = this.getFileExtension(label)
      const fileTypeInfo = FILE_TYPE_MAP[ext]
      const typePriority = fileTypeInfo ? (10 - fileTypeInfo.priority) : 5 // 转换为排序优先级

      sortParts.push('1') // 文件排在目录之后
      sortParts.push(String(typePriority).padStart(2, '0')) // 文件类型优先级
      sortParts.push(label.toLowerCase()) // 文件名字母顺序
    }

    return sortParts.join('_')
  }

  /**
   * 排序补全项
   */
  private sortCompletionItems(items: CompletionItem[]): CompletionItem[] {
    return items.sort((a, b) => {
      // 目录优先
      if (a.kind !== b.kind) {
        return a.kind === CompletionItemKind.Folder ? -1 : 1
      }

      // 按字母顺序
      return a.label.localeCompare(b.label)
    })
  }
}

/**
 * 创建 ETS Rawfile 补全服务
 */
export function createETSRawfileCompletionService(projectRoot: string, lspConfiguration: LanguageServerConfigManager): LanguageServicePlugin {
  logger.getConsola().info('[rawfile-completion] Creating rawfile completion service')

  // 清理项目根目录路径
  const cleanProjectRoot = projectRoot.startsWith('file://')
    ? require('vscode-uri').URI.parse(projectRoot).fsPath
    : projectRoot

  logger.getConsola().info('Cleaned project root:', cleanProjectRoot)
  // 设置项目根并尝试初始化资源解析器
  ResourceResolverManager.getInstance().setProjectRoot(cleanProjectRoot)
  ResourceResolverManager.getInstance().initialize(lspConfiguration)

  return {
    name: 'arkts-rawfile-completion',
    capabilities: {
      completionProvider: {
        triggerCharacters: ['"', '\'', '/'],
        resolveProvider: false,
      },
    },
    create(context) {
      return {
        async provideCompletionItems(document: TextDocument, position: Position): Promise<any> {
          try {
            logger.getConsola().info(`[rawfile-completion] Providing completion items at ${position.line}:${position.character}`)

            const analyzer = new RawfileCompletionAnalyzer(cleanProjectRoot, lspConfiguration)
            const completionContext = analyzer.analyzeContext(document, position)

            if (!completionContext) {
              logger.getConsola().info('[rawfile-completion] No rawfile context found')
              return null
            }

            logger.getConsola().info('[rawfile-completion] Found rawfile context:', completionContext)

            const generator = new RawfileCompletionGenerator()

            // 确保资源解析器已初始化
            if (!ResourceResolverManager.getInstance().ensureInitialized(lspConfiguration)) {
              logger.getConsola().info('[rawfile-completion] Resource resolver not available')
              return null
            }

            const resolver = ResourceResolverManager.getInstance().getResolver()
            if (!resolver) {
              logger.getConsola().info('[rawfile-completion] Resource resolver not available')
              return null
            }

            // 生成补全项
            const completionItems = generator.generateItems(completionContext, resolver.getAllRawfileResources())

            logger.getConsola().info(`[rawfile-completion] Generated ${completionItems.length} completion items`)

            return {
              isIncomplete: false,
              items: completionItems,
            }
          }
          catch (error) {
            logger.getConsola().error('[rawfile-completion] Error in provideCompletionItems:', error)
            return null
          }
        },
      }
    },
  }
}
