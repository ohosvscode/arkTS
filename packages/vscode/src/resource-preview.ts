import path from 'node:path'
import { ElementDirectory, ElementJsonFile, ElementJsonFileReference, MediaDirectory, Module, Product, Project, ProjectDetector, ProjectDetectorManager, Resource, ResourceDirectory } from '@arkts/language-service'
import { Autowired, Service } from 'unioc'
import { Disposable, IOnActivate } from 'unioc/vscode'
import * as vscode from 'vscode'
import { QualifierEditorWebviewPanel } from './qualifier-editor/command'
import { Translator } from './translate'

class MediaFile {
  constructor(
    private readonly name: string,
    private readonly type: vscode.FileType,
    private readonly uri: vscode.Uri,
  ) {}

  static is(value: unknown): value is MediaFile {
    return value instanceof MediaFile
  }

  getName(): string {
    return this.name
  }

  getType(): vscode.FileType {
    return this.type
  }

  getUri(): vscode.Uri {
    return this.uri
  }
}

class ResourceTreeItem<T = unknown> extends vscode.TreeItem {
  node: T

  constructor(node: T, options: Omit<vscode.TreeItem, 'label'> & Required<Pick<vscode.TreeItem, 'label'>>) {
    super(options.label, options.collapsibleState)
    this.node = node
    Object.assign(this, options)
  }

  static is<T>(value: unknown, assert: (value: unknown) => value is T): value is ResourceTreeItem<T> {
    return value instanceof ResourceTreeItem && assert(value.node)
  }
}

@Service
@Disposable
export class ResourceExplorer implements IOnActivate, vscode.TreeDataProvider<ResourceTreeItem>, Disposable {
  @Autowired(ProjectDetectorManager)
  private readonly projectDetectorManager: ProjectDetectorManager

  @Autowired
  private readonly translator: Translator

  @Autowired
  private readonly qualifierEditorWebviewPanel: QualifierEditorWebviewPanel

  private treeView: vscode.TreeView<ResourceTreeItem>

  private emitter = new vscode.EventEmitter<void | ResourceTreeItem<unknown> | ResourceTreeItem<unknown>[] | null | undefined>()

  onDidChangeTreeData: vscode.Event<void | ResourceTreeItem<unknown> | ResourceTreeItem<unknown>[] | null | undefined> | undefined = this.emitter.event

  onActivate(context: vscode.ExtensionContext): void {
    this.treeView = vscode.window.createTreeView<ResourceTreeItem>('ets.resourceExplorer', {
      treeDataProvider: this,
      showCollapseAll: true,
    })
    this.projectDetectorManager.on('file-changed', () => this.emitter.fire())
      .on('file-created', () => this.emitter.fire())
      .on('file-deleted', () => this.emitter.fire())
    context.subscriptions.push(
      vscode.commands.registerCommand('ets.resourceExplorer.refresh', () => this.emitter.fire()),
      vscode.commands.registerCommand('ets.resourceExplorer.openFile', async (item?: ResourceTreeItem<ElementJsonFile | MediaFile>) => {
        if (ResourceTreeItem.is(item, ElementJsonFile.is)) {
          vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(item.node.getUnderlyingElementJsonFile().getUri().toString()))
        }
        else if (ResourceTreeItem.is(item, MediaFile.is)) {
          vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(item.node.getUri().toString()))
        }
        else {
          vscode.window.showWarningMessage('The item is not a ElementJsonFile or MediaFile.')
        }
      }),
      vscode.commands.registerCommand('ets.resourceExplorer.openFileWithReference', async (item?: ElementJsonFileReference, startOffset: number = 0, endOffset: number = 0) => {
        if (!ElementJsonFileReference.is(item)) return vscode.window.showWarningMessage('The item is not a ElementJsonFileReference.')
        const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(item.getUri().toString()))
        await vscode.window.showTextDocument(document, {
          selection: new vscode.Range(
            document.positionAt(item.getStart() + startOffset),
            document.positionAt(item.getEnd() - endOffset),
          ),
        })
      }),
      vscode.commands.registerCommand('ets.resourceExplorer.openResourceQualifierEditor', async (item?: ResourceTreeItem<Resource>) => {
        if (!ResourceTreeItem.is(item, Resource.is)) return vscode.window.showWarningMessage(this.translator.t('command.resourceExplorer.openResourceQualifierEditor.error'))
        const resourceUri = item.node.getUnderlyingResource().getUri().toString()
        if (resourceUri !== this.qualifierEditorWebviewPanel.serverFunction.getResourceUri()) await this.qualifierEditorWebviewPanel.dispose()
        this.qualifierEditorWebviewPanel.serverFunction.setResourceUri(item.node)
        this.qualifierEditorWebviewPanel.createWebviewPanel()
      }),
    )
  }

  getTopLevelChildren(): ResourceTreeItem[] {
    return this.projectDetectorManager.findAll().map(item => (
      new ResourceTreeItem(item, {
        label: vscode.workspace.workspaceFolders?.find(workspaceFolder => workspaceFolder.uri.toString() === item.getUnderlyingProjectDetector().getWorkspaceFolder().toString())?.name ?? item.getUnderlyingProjectDetector().getWorkspaceFolder().toString(),
        id: `ProjectDetector:${item.getUnderlyingProjectDetector().getWorkspaceFolder().toString()}`,
        iconPath: new vscode.ThemeIcon('folder'),
        description: 'Workspace Folder',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      })
    ))
  }

  getChildrenByProjectDetector(element: ResourceTreeItem<ProjectDetector>): ResourceTreeItem<Project>[] {
    return element.node.findAll().map(item => (
      new ResourceTreeItem(item, {
        label: path.relative(element.node.getUnderlyingProjectDetector().getWorkspaceFolder().fsPath, item.getUnderlyingProject().getUri().fsPath) || '/',
        id: `Project:${item.getUnderlyingProject().getUri().toString()}`,
        iconPath: new vscode.ThemeIcon('project'),
        description: 'OpenHarmony/HarmonyOS Project',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      })
    ))
  }

  getChildrenByProject(element: ResourceTreeItem<Project>): ResourceTreeItem<Module>[] {
    return element.node.findAll().map(item => (
      new ResourceTreeItem(item, {
        label: vscode.workspace.asRelativePath(item.getUnderlyingModule().getUri().fsPath),
        id: `Module:${item.getUnderlyingModule().getUri().toString()}`,
        iconPath: new vscode.ThemeIcon('gift'),
        description: 'Module',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      })
    ))
  }

  getChildrenByModule(element: ResourceTreeItem<Module>): ResourceTreeItem<Product>[] {
    return element.node.findAll().map(item => (
      new ResourceTreeItem(item, {
        label: item.getUnderlyingProduct().getName(),
        id: `Product:${item.getUnderlyingProduct().getModule().getUri()}:${item.getUnderlyingProduct().getName()}`,
        iconPath: new vscode.ThemeIcon('library'),
        description: 'Product',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      })
    ))
  }

  getChildrenByProduct(element: ResourceTreeItem<Product>): ResourceTreeItem<Resource>[] {
    return element.node.findAll().map(item => (
      new ResourceTreeItem(item, {
        label: path.relative(element.node.getUnderlyingProduct().getModule().getUri().fsPath, item.getUnderlyingResource().getUri().fsPath) || '/',
        id: `Resource:${item.getUnderlyingResource().getUri().toString()}`,
        iconPath: new vscode.ThemeIcon('layers'),
        description: 'Resource',
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        contextValue: 'Resource',
      })
    ))
  }

  getChildrenByResource(element: ResourceTreeItem<Resource>): ResourceTreeItem<ResourceDirectory>[] {
    return element.node.findAll().map((item) => {
      const qualifiers = item.getUnderlyingResourceDirectory().getQualifiers()

      return new ResourceTreeItem(item, {
        label: path.relative(element.node.getUnderlyingResource().getUri().fsPath, item.getUnderlyingResourceDirectory().getUri().fsPath) || '/',
        id: `ResourceDirectory:${item.getUnderlyingResourceDirectory().getUri().toString()}`,
        iconPath: new vscode.ThemeIcon('folder'),
        description: 'Resource Qualifier Directory',
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        tooltip: new vscode.MarkdownString(`Qualifiers: ${typeof qualifiers === 'string' ? `\`${qualifiers}\`` : qualifiers.map(qualifier => `\`${Object.values(qualifier).join(' ')}\``).join(' ')}`),
      })
    })
  }

  async getChildrenByResourceDirectory(element: ResourceTreeItem<ResourceDirectory>): Promise<ResourceTreeItem[]> {
    const children: ResourceTreeItem[] = []
    const elementDirectory = element.node.getElementDirectory()
    const mediaDirectory = element.node.getMediaDirectory()
    if (elementDirectory) {
      children.push(
        new ResourceTreeItem(elementDirectory, {
          label: 'element',
          id: `ElementDirectory:${elementDirectory.getUnderlyingElementDirectory().getUri().toString()}`,
          iconPath: new vscode.ThemeIcon('folder'),
          description: 'Element Directory',
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        }),
      )
    }
    if (mediaDirectory) {
      children.push(
        new ResourceTreeItem(mediaDirectory, {
          label: 'media',
          id: `MediaDirectory:${mediaDirectory.getUnderlyingMediaDirectory().getUri().toString()}`,
          iconPath: new vscode.ThemeIcon('folder'),
          description: 'Media Directory',
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        }),
      )
    }
    return children
  }

  getChildrenByElementDirectory(elementDirectory: ElementDirectory): ResourceTreeItem[] {
    return elementDirectory.findAll().map((item) => {
      const uri = vscode.Uri.parse(item.getUnderlyingElementJsonFile().getUri().toString())
      return new ResourceTreeItem(item, {
        label: path.relative(elementDirectory.getUnderlyingElementDirectory().getUri().fsPath, item.getUnderlyingElementJsonFile().getUri().fsPath) || '/',
        id: `ElementJsonFile:${uri.toString()}`,
        iconPath: new vscode.ThemeIcon('json'),
        description: 'Element JSON File',
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        contextValue: 'ElementJsonFile',
      })
    })
  }

  getChildrenByElementJsonFile(elementJsonFile: ElementJsonFile): ResourceTreeItem[] {
    return elementJsonFile.findAll().map(item => (
      new ResourceTreeItem(item, {
        label: item.getUnderlyingElementJsonFileReference().getNameText(),
        id: `ElementJsonFileReference:${elementJsonFile.getUnderlyingElementJsonFile().getUri().toString()}:${item.getUnderlyingElementJsonFileReference().getNameFullText()}`,
        iconPath: new vscode.ThemeIcon('references'),
        description: 'Element JSON File Reference',
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        command: {
          command: 'ets.resourceExplorer.openFileWithReference',
          title: 'Open File With Reference',
          arguments: [item, 1, 1],
        },
        tooltip: new vscode.MarkdownString(`- Type: \`${item.getUnderlyingElementJsonFileReference().getElementType()}\`\n- Value: \`${item.getUnderlyingElementJsonFileReference().getValueText()}\``),
      })
    ))
  }

  async getChildrenByMediaDirectory(mediaDirectory: MediaDirectory): Promise<ResourceTreeItem[]> {
    const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(mediaDirectory.getUnderlyingMediaDirectory().getUri().fsPath))
    return files.map(file => (
      new ResourceTreeItem(
        new MediaFile(
          file[0],
          file[1],
          vscode.Uri.joinPath(
            vscode.Uri.file(mediaDirectory.getUnderlyingMediaDirectory().getUri().fsPath),
            file[0],
          ),
        ),
        {
          label: file[0],
          id: `MediaFile:${mediaDirectory.getUnderlyingMediaDirectory().getUri().toString()}:${file[0]}`,
          iconPath: new vscode.ThemeIcon('file'),
          description: 'Media File',
          contextValue: 'MediaFile',
        },
      )
    ))
  }

  getChildren(element?: ResourceTreeItem): ResourceTreeItem[] | Promise<ResourceTreeItem[]> {
    if (!element) return this.getTopLevelChildren()
    if (ResourceTreeItem.is(element, ProjectDetector.is)) return this.getChildrenByProjectDetector(element)
    if (ResourceTreeItem.is(element, Project.is)) return this.getChildrenByProject(element)
    if (ResourceTreeItem.is(element, Module.is)) return this.getChildrenByModule(element)
    if (ResourceTreeItem.is(element, Product.is)) return this.getChildrenByProduct(element)
    if (ResourceTreeItem.is(element, Resource.is)) return this.getChildrenByResource(element)
    if (ResourceTreeItem.is(element, ResourceDirectory.is)) return this.getChildrenByResourceDirectory(element)
    if (ResourceTreeItem.is(element, ElementDirectory.is)) return this.getChildrenByElementDirectory(element.node)
    if (ResourceTreeItem.is(element, ElementJsonFile.is)) return this.getChildrenByElementJsonFile(element.node)
    if (ResourceTreeItem.is(element, MediaDirectory.is)) return this.getChildrenByMediaDirectory(element.node)
    return []
  }

  getTreeItem(element: ResourceTreeItem): vscode.TreeItem {
    return element
  }

  dispose(): void {
    this.treeView.dispose()
    this.emitter.dispose()
  }
}
