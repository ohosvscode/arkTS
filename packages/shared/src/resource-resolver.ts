import type { Range } from 'vscode-languageserver-textdocument'
import type { LanguageServerLogger } from './log/lsp-logger'
import * as fs from 'node:fs'
import { createRequire } from 'node:module'
import * as path from 'node:path'
import { URI } from 'vscode-uri'

/**
 * 资源类型枚举
 */
export enum ResourceType {
  Color = 'color',
  String = 'string',
  Float = 'float',
  Boolean = 'boolean',
  Integer = 'integer',
  Media = 'media',
  Profile = 'profile',
  Symbol = 'symbol',
  Plural = 'plural',
  Rawfile = 'rawfile',
}

/**
 * 资源引用解析结果
 */
export interface ResourceReference {
  /** 资源类型 (app 或 sys) */
  scope: 'app' | 'sys'
  /** 资源类型 */
  type: ResourceType
  /** 资源名称 */
  name: string
  /** 原始引用字符串 */
  raw: string
}

/**
 * Rawfile资源引用解析结果
 */
export interface RawfileReference {
  /** 文件路径 */
  filePath: string
  /** 原始引用字符串 */
  raw: string
}

/**
 * Rawfile资源位置信息
 */
export interface RawfileLocation {
  /** 文件URI */
  uri: string
  /** 文件类型 (file 或 directory) */
  fileType: 'file' | 'directory'
  /** 相对路径 */
  relativePath: string
}

/**
 * Rawfile资源索引项
 */
export interface RawfileIndexItem {
  /** 资源引用 */
  reference: RawfileReference
  /** 资源位置 */
  location: RawfileLocation
}

/**
 * 资源位置信息
 */
export interface ResourceLocation {
  /** 文件URI */
  uri: string
  /** 在文件中的位置（对于JSON资源） */
  range?: Range
  /** 资源值 */
  value?: string
}

/**
 * 资源索引项
 */
export interface ResourceIndexItem {
  /** 资源引用 */
  reference: ResourceReference
  /** 资源位置 */
  location: ResourceLocation
}

/**
 * 解析 $r() 资源引用字符串
 * @param resourceRef 资源引用字符串，如 'app.color.bg_color' 或 'sys.string.title'
 * @returns 解析结果
 */
export function parseResourceReference(resourceRef: string): ResourceReference | null {
  // 移除引号
  const cleanRef = resourceRef.replace(/^['"`]|['"`]$/g, '')

  // 匹配模式: {scope}.{type}.{name}
  const match = cleanRef.match(/^(app|sys)\.(\w+)\.(\w+)$/)
  if (!match) {
    return null
  }

  const [, scope, type, name] = match

  // 验证资源类型
  if (!Object.values(ResourceType).includes(type as ResourceType)) {
    return null
  }

  return {
    scope: scope as 'app' | 'sys',
    type: type as ResourceType,
    name,
    raw: resourceRef,
  }
}

/**
 * 解析 $rawfile() 资源引用字符串
 * @param rawfileRef rawfile引用字符串，如 '1.html' 或 'xxx/2/2.md'
 * @returns 解析结果
 */
export function parseRawfileReference(rawfileRef: string): RawfileReference | null {
  // 移除引号
  const cleanRef = rawfileRef.replace(/^['"\`]|['"\`]$/g, '')

  // rawfile引用就是简单的文件路径，不需要复杂验证
  if (!cleanRef || cleanRef.trim() === '') {
    return null
  }

  return {
    filePath: cleanRef,
    raw: rawfileRef,
  }
}

/**
 * 构建资源文件路径
 * @param projectRoot 项目根路径
 * @param moduleName 模块名（如 'entry', 'sampleLibrary'）
 * @param resourceType 资源类型
 * @returns 资源文件路径
 */
export function buildResourceFilePath(
  projectRoot: string,
  moduleName: string,
  resourceType: ResourceType,
): string {
  const basePath = path.join(projectRoot, moduleName, 'src', 'main', 'resources', 'base')

  if (resourceType === ResourceType.Media) {
    return path.join(basePath, 'media')
  }
  else {
    return path.join(basePath, 'element', `${resourceType}.json`)
  }
}

/**
 * 构建rawfile资源文件路径
 * @param projectRoot 项目根路径
 * @param moduleName 模块名（如 'entry', 'sampleLibrary'）
 * @param filePath rawfile相对路径
 * @returns rawfile完整文件路径
 */
export function buildRawfilePath(
  projectRoot: string,
  moduleName: string,
  filePath: string,
): string {
  return path.join(projectRoot, moduleName, 'src', 'main', 'resources', 'rawfile', filePath)
}

/**
 * 资源解析器类
 */
export class ResourceResolver {
  private projectRoot: string
  private resourceIndex: Map<string, ResourceIndexItem> = new Map()
  private rawfileIndex: Map<string, RawfileIndexItem> = new Map()
  private sdkPath?: string

  getSdkPath(): string | undefined {
    return this.sdkPath
  }

  getProjectRoot(): string {
    return this.projectRoot
  }

  constructor(private readonly logger: LanguageServerLogger, projectRoot: string, sdkPath?: string) {
    this.projectRoot = projectRoot
    this.sdkPath = sdkPath
  }

  /**
   * 查找项目中的所有模块
   */
  private async findModules(): Promise<string[]> {
    const modules: string[] = []

    try {
      await this.findModulesRecursive(this.projectRoot, '', modules, 3) // 最多递归3层
    }
    catch (error) {
      console.error('Failed to find modules:', error)
    }

    return modules
  }

  /**
   * 递归查找模块
   */
  private async findModulesRecursive(currentPath: string, relativePath: string, modules: string[], maxDepth: number): Promise<void> {
    if (maxDepth <= 0)
      return

    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          const fullPath = path.join(currentPath, entry.name)
          const moduleRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name

          // 检查是否是模块（包含 src/main/module.json5 文件）
          const moduleJsonPath = path.join(fullPath, 'src', 'main', 'module.json5')

          if (fs.existsSync(moduleJsonPath)) {
            this.logger.getConsola().log(`Found module: ${moduleRelativePath} at ${fullPath}`)
            modules.push(moduleRelativePath)
          }
          else {
            // 如果不是模块，继续递归查找
            await this.findModulesRecursive(fullPath, moduleRelativePath, modules, maxDepth - 1)
          }
        }
      }
    }
    catch (error) {
      // 忽略无法访问的目录
      this.logger.getConsola().error(`Cannot access directory ${currentPath}:`, error)
    }
  }

  /**
   * 判断是否应该跳过某个目录
   */
  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      'node_modules',
      '.git',
      '.vscode',
      '.idea',
      'dist',
      'build',
      'out',
      '.changeset',
      '.github',
      '.qoder',
      'screenshots',
      'hvigor',
      'autosign',
    ]

    return skipDirs.includes(dirName) || dirName.startsWith('.')
  }

  /**
   * 构建资源索引
   */
  async buildIndex(): Promise<void> {
    this.resourceIndex.clear()
    this.rawfileIndex.clear()
    this.logger.getConsola().log(`Building resource index for project: ${this.projectRoot}`)

    // 索引 app 资源（模块资源）
    const modules = await this.findModules()
    this.logger.getConsola().log(`Found ${modules.length} modules:`, modules)

    for (const moduleName of modules) {
      this.logger.getConsola().log(`Indexing module: ${moduleName}`)
      await this.indexModule(moduleName)
    }

    // 索引 sys 资源（系统资源）
    await this.indexSystemResources()

    this.logger.getConsola().log(`Resource index built with ${this.resourceIndex.size} resources and ${this.rawfileIndex.size} rawfile resources`)
  }

  /**
   * 为特定模块构建索引
   */
  private async indexModule(moduleName: string): Promise<void> {
    const basePath = path.join(this.projectRoot, moduleName, 'src', 'main', 'resources', 'base')

    // 索引 element 文件夹中的 JSON 资源
    await this.indexElementResources(basePath, moduleName)

    // 索引 media 文件夹中的媒体资源
    await this.indexMediaResources(basePath, moduleName)

    // 索引 rawfile 资源
    await this.indexRawfileResources(moduleName)
  }

  /**
   * 索引元素资源（JSON文件）
   */
  private async indexElementResources(basePath: string, moduleName: string): Promise<void> {
    const elementPath = path.join(basePath, 'element')

    if (!fs.existsSync(elementPath)) {
      return
    }

    try {
      const files = await fs.promises.readdir(elementPath)

      for (const file of files) {
        if (file.endsWith('.json')) {
          const resourceType = path.basename(file, '.json') as ResourceType
          if (Object.values(ResourceType).includes(resourceType)) {
            await this.indexJsonResource(path.join(elementPath, file), resourceType)
          }
        }
      }
    }
    catch (error) {
      this.logger.getConsola().error(`Failed to index element resources for ${moduleName}:`, error)
    }
  }

  /**
   * 索引JSON资源文件
   */
  private async indexJsonResource(filePath: string, resourceType: ResourceType): Promise<void> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      const json = JSON.parse(content)
      const lines = content.split('\n')

      if (json[resourceType] && Array.isArray(json[resourceType])) {
        for (const item of json[resourceType]) {
          if (item.name && item.value) {
            // 找到资源在文件中的位置
            const range = this.findJsonItemRange(lines, item.name)

            const reference: ResourceReference = {
              scope: 'app',
              type: resourceType,
              name: item.name,
              raw: `app.${resourceType}.${item.name}`,
            }

            const location: ResourceLocation = {
              uri: URI.file(filePath).toString(),
              range,
              value: item.value,
            }

            const key = `${reference.scope}.${reference.type}.${reference.name}`
            this.resourceIndex.set(key, { reference, location })
          }
        }
      }
    }
    catch (error) {
      this.logger.getConsola().error(`Failed to index JSON resource ${filePath}:`, error)
    }
  }

  /**
   * 索引系统资源（sys 资源）
   */
  private async indexSystemResources(): Promise<void> {
    if (!this.sdkPath) {
      this.logger.getConsola().log('SDK path not provided, skipping system resource indexing')
      return
    }

    const sysResourcePath = path.join(this.sdkPath, 'ets', 'build-tools', 'ets-loader', 'sysResource.js')

    if (!fs.existsSync(sysResourcePath)) {
      this.logger.getConsola().log(`System resource file not found: ${sysResourcePath}`)
      return
    }

    try {
      this.logger.getConsola().log(`Indexing system resources from: ${sysResourcePath}`)
      const require = createRequire('/')
      const sysResources: unknown = require(sysResourcePath)
      if (typeof sysResources !== 'object' || !sysResources || !('sys' in sysResources) || typeof sysResources.sys !== 'object' || !sysResources.sys) {
        this.logger.getConsola().log(`System resource file only support export an 'sys' object. The file must start with 'module.exports.sys = {}'.`)
        return
      }
      this.indexSysResourceObject(sysResources.sys, sysResourcePath)
      this.logger.getConsola().log('System resources indexed successfully')
    }
    catch (error) {
      this.logger.getConsola().error('Failed to index system resources:', error)
    }
  }

  /**
   * 索引系统资源对象
   */
  private indexSysResourceObject(sysResources: any, filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    for (const [resourceType, resources] of Object.entries(sysResources)) {
      if (typeof resources === 'object' && resources !== null) {
        for (const [resourceName, resourceId] of Object.entries(resources)) {
          // 查找资源在文件中的精确位置
          const range = this.findSysResourceItemRange(lines, resourceName, resourceType)

          const reference: ResourceReference = {
            scope: 'sys',
            type: resourceType as ResourceType,
            name: resourceName,
            raw: `sys.${resourceType}.${resourceName}`,
          }

          const location: ResourceLocation = {
            uri: URI.file(filePath).toString(),
            range,
            value: `System Resource ID: ${resourceId}`,
          }

          const key = `${reference.scope}.${reference.type}.${reference.name}`
          this.resourceIndex.set(key, { reference, location })
        }
      }
    }
  }

  /**
   * 在系统资源文件中查找指定资源的位置
   */
  private findSysResourceItemRange(lines: string[], resourceName: string, resourceType: string): Range | undefined {
    let inResourceTypeSection = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // 检查是否进入了对应的资源类型段落
      if (line.includes(`${resourceType}:`)) {
        inResourceTypeSection = true
        continue
      }

      // 如果在资源类型段落中
      if (inResourceTypeSection) {
        // 检查是否离开了当前段落（到了下一个类型或结束）
        if (line.includes('}') && !line.includes(resourceName)) {
          // 检查是否是结束大括号，且不包含目标资源
          const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : ''
          if (nextLine === '' || nextLine.includes(':') || nextLine === '}') {
            inResourceTypeSection = false
            continue
          }
        }

        // 在当前段落中查找具体的资源名称
        if (line.includes(resourceName)) {
          const originalLine = lines[i] // 保持原始的空格
          const start = originalLine.indexOf(resourceName)
          if (start >= 0) {
            return {
              start: { line: i, character: start },
              end: { line: i, character: start + resourceName.length },
            }
          }
        }
      }
    }

    return undefined
  }

  /**
   * 索引媒体资源
   */
  private async indexMediaResources(basePath: string, moduleName: string): Promise<void> {
    const mediaPath = path.join(basePath, 'media')

    if (!fs.existsSync(mediaPath)) {
      return
    }

    try {
      const files = await fs.promises.readdir(mediaPath)

      for (const file of files) {
        const filePath = path.join(mediaPath, file)
        const stat = await fs.promises.stat(filePath)

        if (stat.isFile()) {
          const name = path.basename(file, path.extname(file))

          const reference: ResourceReference = {
            scope: 'app',
            type: ResourceType.Media,
            name,
            raw: `app.media.${name}`,
          }

          const location: ResourceLocation = {
            uri: URI.file(filePath).toString(),
            value: file,
          }

          const key = `${reference.scope}.${reference.type}.${reference.name}`
          this.resourceIndex.set(key, { reference, location })
        }
      }
    }
    catch (error) {
      console.error(`Failed to index media resources for ${moduleName}:`, error)
    }
  }

  /**
   * 在JSON文件中查找指定名称的项的位置
   */
  private findJsonItemRange(lines: string[], itemName: string): Range | undefined {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const nameMatch = line.match(new RegExp(`"name"\\s*:\\s*"${itemName}"`))

      if (nameMatch) {
        const start = line.indexOf(`"${itemName}"`)
        return {
          start: { line: i, character: start },
          end: { line: i, character: start + itemName.length + 2 }, // +2 for quotes
        }
      }
    }

    return undefined
  }

  /**
   * 解析资源引用并返回位置
   */
  async resolveResourceReference(resourceRef: string): Promise<ResourceLocation | null> {
    const parsed = parseResourceReference(resourceRef)
    if (!parsed) {
      return null
    }

    const key = `${parsed.scope}.${parsed.type}.${parsed.name}`
    const item = this.resourceIndex.get(key)

    return item?.location || null
  }

  /**
   * 解析rawfile资源引用并返回位置
   */
  async resolveRawfileReference(rawfileRef: string): Promise<RawfileLocation | null> {
    const parsed = parseRawfileReference(rawfileRef)
    if (!parsed) {
      return null
    }

    const item = this.rawfileIndex.get(parsed.filePath)
    return item?.location || null
  }

  /**
   * 获取所有已索引的资源
   */
  getAllResources(): ResourceIndexItem[] {
    return Array.from(this.resourceIndex.values())
  }

  /**
   * 获取所有已索引的rawfile资源
   */
  getAllRawfileResources(): RawfileIndexItem[] {
    return Array.from(this.rawfileIndex.values())
  }

  /**
   * 清除索引
   */
  clearIndex(): void {
    this.resourceIndex.clear()
    this.rawfileIndex.clear()
  }

  /**
   * 索引rawfile资源
   */
  private async indexRawfileResources(moduleName: string): Promise<void> {
    const rawfilePath = path.join(this.projectRoot, moduleName, 'src', 'main', 'resources', 'rawfile')

    if (!fs.existsSync(rawfilePath)) {
      return
    }

    try {
      await this.indexRawfileRecursive(rawfilePath, '', moduleName)
    }
    catch (error) {
      this.logger.getConsola().error(`Failed to index rawfile resources for ${moduleName}:`, error)
    }
  }

  /**
   * 递归索引rawfile资源
   */
  private async indexRawfileRecursive(currentPath: string, relativePath: string, moduleName: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name)
        const entryRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name
        // 统一使用正斜杠，避免Windows路径问题
        const normalizedRelativePath = entryRelativePath.replace(/\\/g, '/')

        if (entry.isFile()) {
          // 索引文件
          const reference: RawfileReference = {
            filePath: normalizedRelativePath,
            raw: normalizedRelativePath,
          }

          const location: RawfileLocation = {
            uri: URI.file(entryPath).toString(),
            fileType: 'file',
            relativePath: normalizedRelativePath,
          }

          this.rawfileIndex.set(normalizedRelativePath, { reference, location })
        }
        else if (entry.isDirectory()) {
          // 索引目录
          const reference: RawfileReference = {
            filePath: normalizedRelativePath,
            raw: normalizedRelativePath,
          }

          const location: RawfileLocation = {
            uri: URI.file(entryPath).toString(),
            fileType: 'directory',
            relativePath: normalizedRelativePath,
          }

          this.rawfileIndex.set(normalizedRelativePath, { reference, location })

          // 递归索引子目录
          await this.indexRawfileRecursive(entryPath, entryRelativePath, moduleName)
        }
      }
    }
    catch (error) {
      this.logger.getConsola().error(`Cannot access rawfile directory ${currentPath}:`, error)
    }
  }
}
