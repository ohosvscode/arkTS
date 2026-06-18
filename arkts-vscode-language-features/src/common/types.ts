import type * as vscode from 'vscode'

export interface UserInstance {
  deactivate?(): void
}

export type UserModule = new (context: vscode.ExtensionContext) => UserInstance
