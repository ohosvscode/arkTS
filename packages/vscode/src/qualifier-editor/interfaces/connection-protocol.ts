import type { WebviewContext } from '../../context/webview-context'

export namespace QualifierEditorConnectionProtocol {
  export interface ClientFunction {}

  export interface Serializable {
    resourceUri: string
  }

  export interface ServerFunction extends WebviewContext.ServerFunction<ClientFunction, ServerFunction> {
    submit(request: ServerFunction.Submit.Request): Promise<ServerFunction.Submit.Response>
    getResourceUri(): string | undefined
    getResourceRelativeFsPath(): string | undefined
    getProductName(): string | undefined
    getModuleUri(): string | undefined
    getProjectUri(): string | undefined
    getWorkspaceUri(): string | undefined
    getWorkspaceName(): string | undefined
  }

  export namespace ServerFunction {
    export namespace Submit {
      export interface Request {
        qualifierDirectoryName: string
        subdirectoryNames: string[]
      }

      export type Response = SuccessResponse | FailureResponse

      export interface SuccessResponse {
        success: true
      }

      export interface FailureResponse {
        success: false
        message: string
      }
    }
  }
}
