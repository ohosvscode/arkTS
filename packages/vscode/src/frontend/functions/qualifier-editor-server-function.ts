import type { Resource } from '@arkts/language-service'
import { BirpcReturn } from 'birpc'
import { Autowired, Service } from 'unioc'
import { ExtensionContext, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { ProtocolContext } from '../../context/protocol-context'
import { WebviewPanelContext } from '../../context/webview-panel-context'
import { QualifierEditorConnectionProtocol } from '../interfaces/qualifier-editor-connection-protocol'

@Service
export class QualifierEditorServerFunctionImpl extends ProtocolContext<QualifierEditorConnectionProtocol.ClientFunction, QualifierEditorConnectionProtocol.ServerFunction> implements QualifierEditorConnectionProtocol.ServerFunction {
  @Autowired(Translator)
  protected readonly translator: Translator

  @Autowired(ExtensionContext)
  protected readonly extensionContext: vscode.ExtensionContext

  private resource: Resource | undefined
  private disposeEventEmitter: vscode.EventEmitter<void> | undefined = new vscode.EventEmitter<void>()

  onRpcInitialized(_connection: BirpcReturn<QualifierEditorConnectionProtocol.ClientFunction, QualifierEditorConnectionProtocol.ServerFunction>, context: WebviewPanelContext<QualifierEditorConnectionProtocol.ClientFunction, QualifierEditorConnectionProtocol.ServerFunction>): void {
    super.onRpcInitialized(_connection, context)
    this.disposeEventEmitter?.event(() => context.dispose())
  }

  setResourceUri(resource: Resource): void {
    this.resource = resource
  }

  getResourceUri(): string | undefined {
    return this.resource
      ?.getUnderlyingResource()
      .getUri()
      .toString()
  }

  getResourceRelativeFsPath(): string | undefined {
    return vscode.Uri.parse(this.getResourceUri() ?? 'file:///').fsPath.replace(vscode.Uri.parse(this.getWorkspaceUri() ?? 'file:///').fsPath, '')
  }

  getProductName(): string | undefined {
    return this.resource
      ?.getProduct()
      .getUnderlyingProduct()
      .getName()
  }

  getModuleUri(): string | undefined {
    return this.resource
      ?.getProduct()
      .getModule()
      .getUnderlyingModule()
      .getUri()
      .toString()
  }

  getProjectUri(): string | undefined {
    return this.resource
      ?.getProduct()
      .getModule()
      .getProject()
      .getUnderlyingProject()
      .getUri()
      .toString()
  }

  getWorkspaceUri(): string | undefined {
    return this.resource?.getProduct()
      .getModule()
      .getProject()
      .getProjectDetector()
      .getUnderlyingProjectDetector()
      .getWorkspaceFolder()
      .toString()
  }

  getWorkspaceName(): string | undefined {
    return vscode.workspace.workspaceFolders?.find(item => item.uri.toString() === this.getWorkspaceUri())?.name
  }

  async submit(request: QualifierEditorConnectionProtocol.ServerFunction.Submit.Request): Promise<QualifierEditorConnectionProtocol.ServerFunction.Submit.Response> {
    if (!this.resource) return { success: false, message: 'Resource not found' }
    const directoryUri = vscode.Uri.joinPath(vscode.Uri.parse(this.resource.getUnderlyingResource().getUri().toString()), request.qualifierDirectoryName)
    const directoryExists = await vscode.workspace.fs.stat(directoryUri).then(
      () => true,
      () => false,
    )
    if (directoryExists) return { success: false, message: 'Directory already exists.' }
    await vscode.workspace.fs.createDirectory(directoryUri)
    for (const subDirectoryName of request.subdirectoryNames) {
      const subDirectoryUri = vscode.Uri.joinPath(directoryUri, subDirectoryName)
      const subDirectoryExists = await vscode.workspace.fs.stat(subDirectoryUri).then(
        () => true,
        () => false,
      )
      if (subDirectoryExists) return { success: false, message: 'Subdirectory already exists.' }
      await vscode.workspace.fs.createDirectory(subDirectoryUri)
    }
    this.disposeEventEmitter?.fire()
    return { success: true }
  }

  dispose(): void {
    this.resource = undefined
    this.disposeEventEmitter?.dispose()
    this.disposeEventEmitter = undefined
  }
}
