import { Buffer } from 'node:buffer'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as vscode from 'vscode'

/**
 * 支持的图片扩展名列表
 */
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp']

/**
 * 资源引用匹配结果
 */
interface ResourceMatch {
  /** 资源名称（不含扩展名） */
  resourceName: string
  /** 匹配范围 */
  range: vscode.Range
  /** 引用类型 */
  type: 'ets' | 'json'
}

/**
 * 图片悬停预览提供者
 *
 * 支持鸿蒙项目的资源引用格式：
 * - .ets 文件: $r('app.media.icon')
 * - .json/.json5 文件: "$media:icon"
 */
export class ImageHoverProvider implements vscode.HoverProvider {
  /**
   * 提供悬停信息
   *
   * @param document - 当前文档
   * @param position - 鼠标悬停位置
   * @returns 悬停信息或 undefined
   */
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Hover> {
    // 尝试匹配鸿蒙资源引用
    const resourceMatch = this.extractResourceReference(document, position)
    if (resourceMatch) {
      return this.createResourceHover(document, resourceMatch)
    }

    // 尝试匹配普通图片路径
    const imagePath = this.extractImagePath(document, position)
    if (imagePath) {
      const resolvedPath = this.resolveImagePath(document, imagePath)
      if (resolvedPath && fs.existsSync(resolvedPath)) {
        return this.createImageHover(resolvedPath, imagePath)
      }
    }

    return undefined
  }

  /**
   * 提取鸿蒙资源引用
   *
   * @param document - 当前文档
   * @param position - 鼠标位置
   * @returns 资源匹配结果或 undefined
   */
  private extractResourceReference(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): ResourceMatch | undefined {
    const line = document.lineAt(position.line).text

    // 匹配 $r('app.media.xxx') 格式 (ETS 文件)
    const etsPattern = /\$r\(\s*['"]app\.media\.([^'"]+)['"]\s*\)/g
    let match = etsPattern.exec(line)
    while (match !== null) {
      const startIndex = match.index
      const endIndex = startIndex + match[0].length

      if (position.character >= startIndex && position.character <= endIndex) {
        return {
          resourceName: match[1],
          range: new vscode.Range(
            position.line,
            startIndex,
            position.line,
            endIndex,
          ),
          type: 'ets',
        }
      }
      match = etsPattern.exec(line)
    }

    // 匹配 "$media:xxx" 格式 (JSON 文件)
    const jsonPattern = /['"]\$media:([^'"]+)['"]/g
    match = jsonPattern.exec(line)
    while (match !== null) {
      const startIndex = match.index
      const endIndex = startIndex + match[0].length

      if (position.character >= startIndex && position.character <= endIndex) {
        return {
          resourceName: match[1],
          range: new vscode.Range(
            position.line,
            startIndex,
            position.line,
            endIndex,
          ),
          type: 'json',
        }
      }
      match = jsonPattern.exec(line)
    }

    return undefined
  }

  /**
   * 查找资源文件的实际路径
   *
   * @param document - 当前文档
   * @param resourceName - 资源名称
   * @returns 图片文件路径或 undefined
   */
  private findResourceFile(
    document: vscode.TextDocument,
    resourceName: string,
  ): string | undefined {
    const documentPath = document.uri.fsPath

    // 查找可能的资源目录
    const possibleResourceDirs = this.findResourceDirectories(documentPath)

    for (const resourceDir of possibleResourceDirs) {
      const mediaDir = path.join(resourceDir, 'base', 'media')

      if (!fs.existsSync(mediaDir)) continue

      // 尝试各种图片扩展名
      for (const ext of IMAGE_EXTENSIONS) {
        const imagePath = path.join(mediaDir, `${resourceName}${ext}`)
        if (fs.existsSync(imagePath)) {
          return imagePath
        }
      }
    }

    return undefined
  }

  /**
   * 查找可能的资源目录
   *
   * @param documentPath - 当前文档路径
   * @returns 可能的资源目录列表
   */
  private findResourceDirectories(documentPath: string): string[] {
    const directories: string[] = []
    let currentDir = path.dirname(documentPath)
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

    // 向上遍历查找 resources 目录
    while (currentDir && currentDir !== workspaceRoot) {
      // 检查 src/main/resources 结构
      const srcMainResources = path.join(currentDir, 'src', 'main', 'resources')
      if (fs.existsSync(srcMainResources)) {
        directories.push(srcMainResources)
      }

      // 检查直接的 resources 目录
      const directResources = path.join(currentDir, 'resources')
      if (fs.existsSync(directResources)) {
        directories.push(directResources)
      }

      // 检查 AppScope/resources 目录（应用级资源）
      const appScopeResources = path.join(currentDir, 'AppScope', 'resources')
      if (fs.existsSync(appScopeResources)) {
        directories.push(appScopeResources)
      }

      const parentDir = path.dirname(currentDir)
      if (parentDir === currentDir) break
      currentDir = parentDir
    }

    // 同时检查工作区根目录
    if (workspaceRoot) {
      const workspaceAppScope = path.join(workspaceRoot, 'AppScope', 'resources')
      if (fs.existsSync(workspaceAppScope) && !directories.includes(workspaceAppScope)) {
        directories.push(workspaceAppScope)
      }
    }

    return directories
  }

  /**
   * 创建资源引用的悬停预览
   *
   * @param document - 当前文档
   * @param resourceMatch - 资源匹配结果
   * @returns 悬停对象或 undefined
   */
  private createResourceHover(
    document: vscode.TextDocument,
    resourceMatch: ResourceMatch,
  ): vscode.Hover | undefined {
    const imagePath = this.findResourceFile(document, resourceMatch.resourceName)

    if (!imagePath) {
      // 即使找不到图片，也返回资源信息
      const markdown = new vscode.MarkdownString()
      markdown.appendMarkdown(`**🔗 资源引用**\n\n`)
      markdown.appendMarkdown(`- 资源名称: \`${resourceMatch.resourceName}\`\n`)
      markdown.appendMarkdown(`- 引用格式: \`${resourceMatch.type === 'ets' ? `app.media.${resourceMatch.resourceName}` : `$media:${resourceMatch.resourceName}`}\`\n`)
      markdown.appendMarkdown(`\n⚠️ *未找到对应的图片文件*`)
      return new vscode.Hover(markdown, resourceMatch.range)
    }

    const ext = path.extname(imagePath).toLowerCase()
    const fileName = path.basename(imagePath)
    const stats = fs.statSync(imagePath)
    const fileSize = this.formatFileSize(stats.size)

    const markdown = new vscode.MarkdownString()
    markdown.isTrusted = true
    markdown.supportHtml = true

    // 添加资源信息
    markdown.appendMarkdown(`**🖼️ ${resourceMatch.resourceName}**\n\n`)
    markdown.appendMarkdown(`| 属性 | 值 |\n`)
    markdown.appendMarkdown(`|------|----|\n`)
    markdown.appendMarkdown(`| 文件名 | \`${fileName}\` |\n`)
    markdown.appendMarkdown(`| 大小 | \`${fileSize}\` |\n`)
    markdown.appendMarkdown(`| ETS 格式 | \`app.media.${resourceMatch.resourceName}\` |\n`)
    markdown.appendMarkdown(`| JSON 格式 | \`$media:${resourceMatch.resourceName}\` |\n\n`)

    // 添加图片预览
    markdown.appendMarkdown(`---\n\n`)
    if (ext === '.svg') {
      const svgContent = fs.readFileSync(imagePath, 'utf-8')
      const base64 = Buffer.from(svgContent).toString('base64')
      markdown.appendMarkdown(`<img src="data:image/svg+xml;base64,${base64}" width="200" alt="${fileName}" />\n\n`)
    }
    else {
      const imageUri = vscode.Uri.file(imagePath)
      markdown.appendMarkdown(`![${fileName}](${imageUri.toString()}|width=200)\n\n`)
    }

    // 添加路径信息
    markdown.appendMarkdown(`---\n`)
    markdown.appendMarkdown(`*路径: \`${imagePath}\`*`)

    return new vscode.Hover(markdown, resourceMatch.range)
  }

  /**
   * 从文档中提取普通图片路径
   *
   * @param document - 当前文档
   * @param position - 鼠标位置
   * @returns 提取到的图片路径或 undefined
   */
  private extractImagePath(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): string | undefined {
    const line = document.lineAt(position.line).text

    // 匹配各种路径格式
    const patterns = [
      /"([^"]*\.(png|jpg|jpeg|gif|svg|webp|ico|bmp))"/gi,
      /'([^']*\.(png|jpg|jpeg|gif|svg|webp|ico|bmp))'/gi,
      /`([^`]*\.(png|jpg|jpeg|gif|svg|webp|ico|bmp))`/gi,
    ]

    for (const pattern of patterns) {
      pattern.lastIndex = 0
      let match = pattern.exec(line)

      while (match !== null) {
        const matchedPath = match[1]

        // 跳过鸿蒙资源引用格式
        if (matchedPath.startsWith('$media:') || matchedPath.startsWith('app.media.')) {
          match = pattern.exec(line)
          continue
        }

        const startIndex = match.index + 1
        const endIndex = startIndex + matchedPath.length

        if (position.character >= startIndex && position.character <= endIndex) {
          return matchedPath
        }
        match = pattern.exec(line)
      }
    }

    return undefined
  }

  /**
   * 解析图片的绝对路径
   *
   * @param document - 当前文档
   * @param imagePath - 相对或绝对图片路径
   * @returns 解析后的绝对路径
   */
  private resolveImagePath(
    document: vscode.TextDocument,
    imagePath: string,
  ): string | undefined {
    if (path.isAbsolute(imagePath)) {
      return imagePath
    }

    const documentDir = path.dirname(document.uri.fsPath)
    const resolvedPath = path.resolve(documentDir, imagePath)

    if (fs.existsSync(resolvedPath)) {
      return resolvedPath
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
    if (workspaceFolder) {
      const workspaceRootPath = path.join(workspaceFolder.uri.fsPath, imagePath)
      if (fs.existsSync(workspaceRootPath)) {
        return workspaceRootPath
      }
    }

    return undefined
  }

  /**
   * 创建普通图片路径的悬停预览
   *
   * @param imagePath - 图片绝对路径
   * @param originalPath - 原始路径字符串
   * @returns 悬停对象
   */
  private createImageHover(
    imagePath: string,
    originalPath: string,
  ): vscode.Hover {
    const ext = path.extname(imagePath).toLowerCase()
    const fileName = path.basename(imagePath)
    const stats = fs.statSync(imagePath)
    const fileSize = this.formatFileSize(stats.size)

    const markdown = new vscode.MarkdownString()
    markdown.isTrusted = true
    markdown.supportHtml = true

    markdown.appendMarkdown(`**📷 ${fileName}**\n\n`)
    markdown.appendMarkdown(`📁 大小: \`${fileSize}\`\n\n`)

    if (ext === '.svg') {
      const svgContent = fs.readFileSync(imagePath, 'utf-8')
      const base64 = Buffer.from(svgContent).toString('base64')
      markdown.appendMarkdown(`<img src="data:image/svg+xml;base64,${base64}" width="200" alt="${fileName}" />\n\n`)
    }
    else {
      const imageUri = vscode.Uri.file(imagePath)
      markdown.appendMarkdown(`![${fileName}](${imageUri.toString()}|width=200)\n\n`)
    }

    markdown.appendMarkdown(`---\n`)
    markdown.appendMarkdown(`*路径: \`${originalPath}\`*`)

    return new vscode.Hover(markdown)
  }

  /**
   * 格式化文件大小
   *
   * @param bytes - 文件字节数
   * @returns 格式化后的文件大小字符串
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
}

/**
 * 注册图片悬停预览提供者
 *
 * @param context - VSCode 扩展上下文
 */
export function registerImageHoverProvider(context: vscode.ExtensionContext): void {
  const provider = new ImageHoverProvider()

  // 支持的语言列表
  const languages = ['ets', 'typescript', 'javascript', 'json', 'jsonc', 'html', 'css', 'markdown']

  for (const language of languages) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(language, provider),
    )
  }
}
