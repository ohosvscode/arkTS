import { ExtensionLogger } from '@arkts/shared/vscode'
import { Disposable } from 'unioc/vscode'
import * as vscode from 'vscode'

@Disposable
export class AbstractWatcher extends ExtensionLogger implements Disposable {
  private _vscodeWatcher: vscode.FileSystemWatcher | undefined

  get vscodeWatcher(): vscode.FileSystemWatcher {
    if (!this._vscodeWatcher) {
      this._vscodeWatcher = vscode.workspace.createFileSystemWatcher('**/*')
    }
    return this._vscodeWatcher
  }

  async dispose(): Promise<void> {
    this._vscodeWatcher?.dispose()
  }
}
