import { Buffer } from 'node:buffer'
import os from 'node:os'
import path from 'node:path'
/**
 * 项目写入路径文件系统操作模块。
 *
 * 在 project-write-path-guard 的安全校验基础上，封装实际的文件系统写入操作：
 * 1. validateProjectWriteDirectory: 校验 + 路径解析 + 空目录检查的组合入口
 * 2. assertProjectFilesCanBeCreated: 批量检查目标文件是否已存在（防覆盖）
 * 3. writeFileExclusive: 排他写入，文件已存在则拒绝（防竞态覆盖）
 * 4. ensureEmptyProjectDirectory: 创建目录并确保为空
 *
 * 调用方：project-server-function.ts 的 downloadAndExtractTemplate 和 createProject
 */
import * as vscode from 'vscode'
import {
  assertWritableProjectDirectoryPath,
  IGNORED_DIRECTORY_ENTRIES,
  ProjectWritePathError,
} from './project-write-path-guard'

async function uriExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri)
    return true
  }
  catch {
    return false
  }
}

export async function listSignificantDirectoryEntries(directoryUri: vscode.Uri): Promise<string[]> {
  if (!await uriExists(directoryUri)) return []

  const stat = await vscode.workspace.fs.stat(directoryUri)
  if (stat.type !== vscode.FileType.Directory) return []

  const entries = await vscode.workspace.fs.readDirectory(directoryUri)
  return entries
    .filter(([name]) => !IGNORED_DIRECTORY_ENTRIES.has(name))
    .map(([name]) => name)
}

export async function validateProjectWriteDirectory(
  targetPath: string,
  homeDirectory: string = os.homedir(),
): Promise<string> {
  const resolved = assertWritableProjectDirectoryPath(targetPath, homeDirectory)
  const resolvedUri = vscode.Uri.file(resolved)

  if (await uriExists(resolvedUri)) {
    const stat = await vscode.workspace.fs.stat(resolvedUri)
    if (stat.type !== vscode.FileType.Directory) {
      throw new ProjectWritePathError('NOT_DIRECTORY', 'Project write path is not a directory.', resolved)
    }
  }

  const existingEntries = await listSignificantDirectoryEntries(resolvedUri)
  if (existingEntries.length > 0) {
    throw new ProjectWritePathError(
      'NOT_EMPTY',
      'Project write directory is not empty.',
      existingEntries.slice(0, 5).join(', '),
    )
  }

  return resolved
}

export async function assertProjectFilesCanBeCreated(outputPaths: string[]): Promise<void> {
  for (const outputPath of outputPaths) {
    const uri = vscode.Uri.file(outputPath)
    if (await uriExists(uri)) {
      throw new ProjectWritePathError('FILE_EXISTS', 'A file already exists at the target path.', outputPath)
    }
  }
}

export async function writeFileExclusive(outputPath: string, content: string | Uint8Array): Promise<void> {
  const uri = vscode.Uri.file(outputPath)
  if (await uriExists(uri)) {
    throw new ProjectWritePathError('FILE_EXISTS', 'Refusing to overwrite an existing file.', outputPath)
  }

  const parentUri = vscode.Uri.file(path.dirname(outputPath))
  await vscode.workspace.fs.createDirectory(parentUri)
  const uint8Content = typeof content === 'string' ? Buffer.from(content) : content
  await vscode.workspace.fs.writeFile(uri, uint8Content)
}

export async function ensureEmptyProjectDirectory(directoryPath: string): Promise<void> {
  const uri = vscode.Uri.file(directoryPath)
  await vscode.workspace.fs.createDirectory(uri)

  const existingEntries = await listSignificantDirectoryEntries(uri)
  if (existingEntries.length > 0) {
    throw new ProjectWritePathError(
      'NOT_EMPTY',
      'Project write directory is not empty.',
      existingEntries.slice(0, 5).join(', '),
    )
  }
}
