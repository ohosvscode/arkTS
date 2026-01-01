import type { Resource } from '@arkts/language-service'
import { Autowired, Service } from 'unioc'
import * as vscode from 'vscode'
import { ProtocolContext } from '../context/protocol-context'
import { Translator } from '../translate'
import { QualifierEditorConnectionProtocol } from './interfaces/connection-protocol'

@Service
export class QualifierEditorServerFunctionImpl extends ProtocolContext implements QualifierEditorConnectionProtocol.ServerFunction {
  @Autowired
  protected readonly translator: Translator

  private resource: Resource | undefined

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

  async submit(request: QualifierEditorConnectionProtocol.ServerFunction.Submit.Request): Promise<void> {
    console.warn(this.resource, request)
  }

  dispose(): void {
    this.resource = undefined
  }
}
