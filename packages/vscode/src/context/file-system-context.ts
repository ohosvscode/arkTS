import { Service } from 'unioc'
import * as vscode from 'vscode'
import { FileSystemException } from '../errors/file-system-exception'
import { retry, timeout } from '../utils'

@Service
export class FileSystemContext {
  /**
   * Get the current active workspace directory.
   *
   * @returns {vscode.Uri | undefined} The current workspace directory.
   */
  getCurrentWorkspaceDir(): vscode.Uri | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders || workspaceFolders.length === 0) return undefined

    // 如果有活动文档，找到包含该文档的工作区
    if (vscode.window.activeTextEditor) {
      const documentUri = vscode.window.activeTextEditor.document.uri
      const containingWorkspace = workspaceFolders.find(folder =>
        documentUri.fsPath.startsWith(folder.uri.fsPath),
      )
      if (containingWorkspace) {
        return containingWorkspace.uri
      }
    }

    // 回退到第一个工作区
    return workspaceFolders[0]?.uri
  }

  async readFileToString(uri: vscode.Uri, times: number = 3): Promise<string> {
    const error = new FileSystemException(FileSystemException.FileSystemExceptionCode.FileNotFound, `File not found: ${uri.fsPath}`)

    return retry(() =>
      timeout(
        () =>
          vscode.workspace.fs.readFile(uri).then(
            uint8Array => uint8Array.toString(),
            () => '',
          ),
        3000,
        error,
      ), times, error)
  }

  async isFile(uri: vscode.Uri, times: number = 3): Promise<boolean> {
    return retry(() => timeout(
      () => vscode.workspace.fs.stat(uri).then(
        stat => stat.type === vscode.FileType.File,
        () => false,
      ),
      3000,
    ), times).catch(() => false)
  }

  async isDirectory(uri: vscode.Uri, times: number = 3): Promise<boolean> {
    return retry(() => timeout(
      () => vscode.workspace.fs.stat(uri).then(
        stat => stat.type === vscode.FileType.Directory,
        () => false,
      ),
      3000,
    ), times).catch(() => false)
  }

  async isExists(uri: vscode.Uri, times: number = 3): Promise<boolean> {
    return retry(() => timeout(
      () => vscode.workspace.fs.stat(uri).then(() => true, () => false),
      3000,
    ), times).catch(() => false)
  }
}
