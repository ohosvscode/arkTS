import { Buffer } from 'node:buffer'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as vscode from 'vscode'

/**
 * 支持的图片扩展名列表
 */
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp']

/**
 * 图片文件树节点
 */
export class ImageTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly resourceUri: vscode.Uri,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly isDirectory: boolean,
    public readonly filePath: string,
  ) {
    super(label, collapsibleState)

    if (!isDirectory) {
      this.tooltip = filePath
      this.command = {
        command: 'ets.previewImage',
        title: '预览图片',
        arguments: [filePath],
      }
      // 设置图标
      const ext = path.extname(filePath).toLowerCase()
      this.iconPath = this.getIconForExtension(ext)
    }
    else {
      this.iconPath = new vscode.ThemeIcon('folder')
    }
  }

  /**
   * 根据扩展名获取图标
   *
   * @param ext - 文件扩展名
   * @returns ThemeIcon 对象
   */
  private getIconForExtension(ext: string): vscode.ThemeIcon {
    switch (ext) {
      case '.svg':
        return new vscode.ThemeIcon('symbol-misc')
      case '.gif':
        return new vscode.ThemeIcon('play-circle')
      default:
        return new vscode.ThemeIcon('file-media')
    }
  }
}

/**
 * 图片文件资源管理器数据提供者
 *
 * 扫描工作区中的图片文件并以树形结构展示
 */
export class ImageExplorerProvider implements vscode.TreeDataProvider<ImageTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ImageTreeItem | undefined | null | void> = new vscode.EventEmitter<ImageTreeItem | undefined | null | void>()
  readonly onDidChangeTreeData: vscode.Event<ImageTreeItem | undefined | null | void> = this._onDidChangeTreeData.event

  constructor(private workspaceRoot: string | undefined) {}

  /**
   * 刷新树视图
   */
  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  /**
   * 获取树节点元素
   *
   * @param element - 树节点元素
   * @returns TreeItem 对象
   */
  getTreeItem(element: ImageTreeItem): vscode.TreeItem {
    return element
  }

  /**
   * 获取子节点
   *
   * @param element - 父节点
   * @returns 子节点数组
   */
  getChildren(element?: ImageTreeItem): Thenable<ImageTreeItem[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('请打开一个工作区')
      return Promise.resolve([])
    }

    if (element) {
      // 获取目录下的图片文件
      return Promise.resolve(this.getImagesInDirectory(element.filePath))
    }
    else {
      // 获取根目录
      return Promise.resolve(this.getImagesInDirectory(this.workspaceRoot))
    }
  }

  /**
   * 获取目录下的图片文件和包含图片的子目录
   *
   * @param dirPath - 目录路径
   * @returns ImageTreeItem 数组
   */
  private getImagesInDirectory(dirPath: string): ImageTreeItem[] {
    if (!fs.existsSync(dirPath)) {
      return []
    }

    const items: ImageTreeItem[] = []

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        // 跳过 node_modules、.git 等目录
        if (entry.isDirectory() && this.shouldSkipDirectory(entry.name)) {
          continue
        }

        if (entry.isDirectory()) {
          // 检查目录下是否有图片文件
          if (this.hasImagesInDirectory(fullPath)) {
            items.push(new ImageTreeItem(
              entry.name,
              vscode.Uri.file(fullPath),
              vscode.TreeItemCollapsibleState.Collapsed,
              true,
              fullPath,
            ))
          }
        }
        else if (this.isImageFile(entry.name)) {
          items.push(new ImageTreeItem(
            entry.name,
            vscode.Uri.file(fullPath),
            vscode.TreeItemCollapsibleState.None,
            false,
            fullPath,
          ))
        }
      }
    }
    catch {
      // 忽略无法读取的目录
    }

    // 排序：目录在前，文件在后
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.label.localeCompare(b.label)
    })

    return items
  }

  /**
   * 判断目录是否应该跳过
   *
   * @param dirName - 目录名
   * @returns 是否跳过
   */
  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = ['node_modules', '.git', '.hvigor', 'oh_modules', 'build', 'dist', '.idea', '.vscode']
    return skipDirs.includes(dirName) || dirName.startsWith('.')
  }

  /**
   * 判断文件是否为图片文件
   *
   * @param fileName - 文件名
   * @returns 是否为图片文件
   */
  private isImageFile(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase()
    return IMAGE_EXTENSIONS.includes(ext)
  }

  /**
   * 检查目录下是否有图片文件（递归）
   *
   * @param dirPath - 目录路径
   * @returns 是否包含图片
   */
  private hasImagesInDirectory(dirPath: string): boolean {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          if (this.hasImagesInDirectory(path.join(dirPath, entry.name))) {
            return true
          }
        }
        else if (this.isImageFile(entry.name)) {
          return true
        }
      }
    }
    catch {
      // 忽略无法读取的目录
    }

    return false
  }
}

/**
 * 图片预览 Webview 面板提供者
 */
export class ImagePreviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ets.imagePreview'
  private _view?: vscode.WebviewView
  private _currentImagePath?: string

  constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * 解析 Webview 视图
   *
   * @param webviewView - Webview 视图
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
  ): void {
    this._view = webviewView

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri,
        ...(vscode.workspace.workspaceFolders?.map(f => f.uri) || []),
      ],
    }

    this._updateWebview()
  }

  /**
   * 预览指定图片
   *
   * @param imagePath - 图片路径
   */
  previewImage(imagePath: string): void {
    this._currentImagePath = imagePath
    this._updateWebview()

    // 确保视图可见
    if (this._view) {
      this._view.show(true)
    }
  }

  /**
   * 更新 Webview 内容
   */
  private _updateWebview(): void {
    if (!this._view) return

    if (!this._currentImagePath || !fs.existsSync(this._currentImagePath)) {
      this._view.webview.html = this._getEmptyHtml()
      return
    }

    const ext = path.extname(this._currentImagePath).toLowerCase()
    const fileName = path.basename(this._currentImagePath)
    const stats = fs.statSync(this._currentImagePath)
    const fileSize = this._formatFileSize(stats.size)

    let imageContent: string

    if (ext === '.svg') {
      // SVG 使用 data URI
      const svgContent = fs.readFileSync(this._currentImagePath, 'utf-8')
      const base64 = Buffer.from(svgContent).toString('base64')
      imageContent = `data:image/svg+xml;base64,${base64}`
    }
    else {
      // 其他格式使用 webview URI
      const imageUri = this._view.webview.asWebviewUri(vscode.Uri.file(this._currentImagePath))
      imageContent = imageUri.toString()
    }

    this._view.webview.html = this._getImageHtml(fileName, fileSize, imageContent, this._currentImagePath)
  }

  /**
   * 获取空状态 HTML
   *
   * @returns HTML 字符串
   */
  private _getEmptyHtml(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-sideBar-background);
    }
    .empty-state {
      text-align: center;
      opacity: 0.6;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="empty-state">
    <div class="icon">🖼️</div>
    <p>点击左侧图片文件<br/>查看预览</p>
  </div>
</body>
</html>`
  }

  /**
   * 获取图片预览 HTML
   *
   * @param fileName - 文件名
   * @param fileSize - 文件大小
   * @param imageSrc - 图片源
   * @param filePath - 文件路径
   * @returns HTML 字符串
   */
  private _getImageHtml(fileName: string, fileSize: string, imageSrc: string, filePath: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-sideBar-background);
      padding: 16px;
      min-height: 100vh;
    }
    .header {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-sideBar-border, rgba(128, 128, 128, 0.35));
    }
    .file-name {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      word-break: break-all;
    }
    .file-info {
      font-size: 12px;
      opacity: 0.8;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .file-info span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .preview-container {
      display: flex;
      justify-content: center;
      align-items: center;
      background: var(--vscode-editor-background);
      border-radius: 8px;
      padding: 16px;
      min-height: 200px;
      /* 棋盘格背景，用于显示透明图片 */
      background-image: 
        linear-gradient(45deg, var(--vscode-checkbox-border) 25%, transparent 25%),
        linear-gradient(-45deg, var(--vscode-checkbox-border) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, var(--vscode-checkbox-border) 75%),
        linear-gradient(-45deg, transparent 75%, var(--vscode-checkbox-border) 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
    }
    .preview-image {
      max-width: 100%;
      max-height: 400px;
      object-fit: contain;
      border-radius: 4px;
    }
    .actions {
      margin-top: 16px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .action-btn {
      padding: 6px 12px;
      font-size: 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .action-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .action-btn.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .action-btn.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .path-info {
      margin-top: 12px;
      font-size: 11px;
      opacity: 0.6;
      word-break: break-all;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="file-name">📷 ${fileName}</div>
    <div class="file-info">
      <span>📁 ${fileSize}</span>
    </div>
  </div>
  
  <div class="preview-container">
    <img class="preview-image" src="${imageSrc}" alt="${fileName}" />
  </div>

  <div class="actions">
    <button class="action-btn" onclick="copyPath()">📋 复制路径</button>
    <button class="action-btn secondary" onclick="openInEditor()">📝 打开文件</button>
    <button class="action-btn secondary" onclick="revealInExplorer()">📂 在资源管理器中显示</button>
  </div>

  <div class="path-info">
    路径: ${filePath}
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const filePath = ${JSON.stringify(filePath)};

    function copyPath() {
      vscode.postMessage({ command: 'copyPath', path: filePath });
    }

    function openInEditor() {
      vscode.postMessage({ command: 'openFile', path: filePath });
    }

    function revealInExplorer() {
      vscode.postMessage({ command: 'revealInExplorer', path: filePath });
    }
  </script>
</body>
</html>`
  }

  /**
   * 格式化文件大小
   *
   * @param bytes - 文件字节数
   * @returns 格式化后的文件大小字符串
   */
  private _formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  /**
   * 处理 Webview 消息
   *
   * @param context - 扩展上下文
   */
  handleMessages(context: vscode.ExtensionContext): void {
    this._view?.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'copyPath':
            await vscode.env.clipboard.writeText(message.path)
            vscode.window.showInformationMessage('路径已复制到剪贴板')
            break
          case 'openFile': {
            const doc = await vscode.workspace.openTextDocument(message.path)
            await vscode.window.showTextDocument(doc)
            break
          }
          case 'revealInExplorer':
            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(message.path))
            break
        }
      },
      undefined,
      context.subscriptions,
    )
  }
}

/**
 * 注册图片资源管理器视图
 *
 * @param context - VSCode 扩展上下文
 */
export function registerImageExplorer(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

  // 创建树视图数据提供者
  const imageExplorerProvider = new ImageExplorerProvider(workspaceRoot)

  // 注册树视图
  const treeView = vscode.window.createTreeView('ets.imageExplorer', {
    treeDataProvider: imageExplorerProvider,
    showCollapseAll: true,
  })

  // 创建预览面板提供者
  const previewProvider = new ImagePreviewProvider(context.extensionUri)

  // 注册 Webview 视图提供者
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ImagePreviewProvider.viewType, previewProvider),
  )

  // 注册预览图片命令
  context.subscriptions.push(
    vscode.commands.registerCommand('ets.previewImage', (imagePath: string) => {
      previewProvider.previewImage(imagePath)
      previewProvider.handleMessages(context)
    }),
  )

  // 注册刷新命令
  context.subscriptions.push(
    vscode.commands.registerCommand('ets.refreshImageExplorer', () => {
      imageExplorerProvider.refresh()
    }),
  )

  // 监听文件系统变化
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{png,jpg,jpeg,gif,svg,webp,ico,bmp}')
  watcher.onDidCreate(() => imageExplorerProvider.refresh())
  watcher.onDidDelete(() => imageExplorerProvider.refresh())
  context.subscriptions.push(watcher)

  context.subscriptions.push(treeView)
}
