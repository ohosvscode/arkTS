import { Buffer } from 'node:buffer'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as vscode from 'vscode'

/**
 * 图片悬停预览提供者
 *
 * 当用户在代码中悬停在图片路径上时，显示图片缩略图预览
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
    const imagePath = this.extractImagePath(document, position)
    if (!imagePath) return undefined

    const resolvedPath = this.resolveImagePath(document, imagePath)
    if (!resolvedPath || !fs.existsSync(resolvedPath)) return undefined

    const hover = this.createImageHover(resolvedPath, imagePath)
    return hover
  }

  /**
   * 从文档中提取图片路径
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

    // 匹配各种路径格式：
    // 1. 字符串路径: "path/to/image.png" 或 'path/to/image.png'
    // 2. 相对路径: ./images/logo.png, ../assets/icon.svg
    // 3. 绝对路径: /assets/image.png
    const patterns = [
      // 双引号字符串
      /"([^"]*\.(png|jpg|jpeg|gif|svg|webp|ico|bmp))"/gi,
      // 单引号字符串
      /'([^']*\.(png|jpg|jpeg|gif|svg|webp|ico|bmp))'/gi,
      // 反引号字符串
      /`([^`]*\.(png|jpg|jpeg|gif|svg|webp|ico|bmp))`/gi,
    ]

    for (const pattern of patterns) {
      pattern.lastIndex = 0
      let match = pattern.exec(line)

      while (match !== null) {
        const startIndex = match.index + 1 // 跳过引号
        const endIndex = startIndex + match[1].length

        // 检查鼠标位置是否在匹配范围内
        if (position.character >= startIndex && position.character <= endIndex) {
          return match[1]
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
    // 如果已经是绝对路径
    if (path.isAbsolute(imagePath)) {
      return imagePath
    }

    // 获取当前文档所在目录
    const documentDir = path.dirname(document.uri.fsPath)

    // 相对路径解析
    const resolvedPath = path.resolve(documentDir, imagePath)

    // 如果文件存在，返回解析后的路径
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath
    }

    // 尝试从工作区根目录解析
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
   * 创建图片悬停预览
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

    // 添加文件信息
    markdown.appendMarkdown(`**📷 ${fileName}**\n\n`)
    markdown.appendMarkdown(`📁 大小: \`${fileSize}\`\n\n`)

    // 根据图片类型添加预览
    if (ext === '.svg') {
      // SVG 文件使用 data URI
      const svgContent = fs.readFileSync(imagePath, 'utf-8')
      const base64 = Buffer.from(svgContent).toString('base64')
      markdown.appendMarkdown(`<img src="data:image/svg+xml;base64,${base64}" width="200" alt="${fileName}" />\n\n`)
    }
    else {
      // 其他图片格式使用 file URI
      const imageUri = vscode.Uri.file(imagePath)
      markdown.appendMarkdown(`![${fileName}](${imageUri.toString()}|width=200)\n\n`)
    }

    // 添加路径信息
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

  // 为每种语言注册 HoverProvider
  for (const language of languages) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(language, provider),
    )
  }
}
