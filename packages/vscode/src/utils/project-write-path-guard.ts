/**
 * 项目写入路径安全守卫模块。
 *
 * 职责：
 * 1. 定义 ProjectWritePathError 异常体系，统一表达路径写入相关的各类错误
 * 2. 拦截系统目录、文件系统根目录、Home 目录根等不安全的写入目标
 * 3. 提供 Zip Slip 攻击防护，防止模板压缩包中的恶意路径逃逸
 * 4. 提供 isRootDevEcoStudioProjectsPath 辅助判断，配合前端智能路径替换逻辑
 *
 * 调用方：project-configuration.ts（前端表单校验）、project-server-function.ts（服务端写入前校验）
 */
import path from 'node:path'

export const IGNORED_DIRECTORY_ENTRIES = new Set(['.DS_Store'])

export type ProjectWritePathErrorCode
  = | 'INVALID_PATH'
    | 'NOT_DIRECTORY'
    | 'NOT_EMPTY'
    | 'FILE_EXISTS'
    | 'ZIP_SLIP'
    | 'BLOCKED_SYSTEM_PATH'

export class ProjectWritePathError extends Error {
  constructor(
    public readonly code: ProjectWritePathErrorCode,
    message: string,
    public readonly detail?: string,
  ) {
    super(message)
    this.name = 'ProjectWritePathError'
  }
}

export function isRootDevEcoStudioProjectsPath(savePath: string): boolean {
  return savePath === '/DevEcoStudioProjects' || savePath.startsWith('/DevEcoStudioProjects/')
}

function isWindowsSystemPath(resolved: string): boolean {
  const root = path.parse(resolved).root.toLowerCase()
  const lower = resolved.toLowerCase()
  const blockedPrefixes = [
    `${root}windows`,
    `${root}program files`,
    `${root}program files (x86)`,
    `${root}programdata`,
  ]
  return blockedPrefixes.some(prefix => lower === prefix || lower.startsWith(`${prefix}\\`))
}

function isUnixSystemPath(resolved: string): boolean {
  if (resolved === '/Library' || resolved.startsWith('/Library/')) return true

  const blockedPrefixes = [
    '/etc',
    '/usr',
    '/bin',
    '/sbin',
    '/var',
    '/opt',
    '/System',
    '/private/etc',
    '/private/var',
  ]
  return blockedPrefixes.some(prefix => resolved === prefix || resolved.startsWith(`${prefix}/`))
}

export function assertWritableProjectDirectoryPath(
  targetPath: string,
  homeDirectory: string,
): string {
  const trimmed = targetPath.trim()
  if (!trimmed) {
    throw new ProjectWritePathError('INVALID_PATH', 'Project write path is empty.')
  }

  const resolved = path.resolve(trimmed)
  const homeResolved = path.resolve(homeDirectory)
  const root = path.parse(resolved).root

  const trailingBackslashRe = /\\$/

  if (!root || resolved === root || resolved === root.replace(trailingBackslashRe, '')) {
    throw new ProjectWritePathError('BLOCKED_SYSTEM_PATH', 'Cannot write project to filesystem root.', resolved)
  }

  if (isRootDevEcoStudioProjectsPath(resolved)) {
    throw new ProjectWritePathError('BLOCKED_SYSTEM_PATH', 'Cannot write project to root DevEcoStudioProjects path.', resolved)
  }

  // eslint-disable-next-line node/prefer-global/process
  const isWin = typeof process !== 'undefined' && process.platform === 'win32'
  if (isWin) {
    if (isWindowsSystemPath(resolved)) {
      throw new ProjectWritePathError('BLOCKED_SYSTEM_PATH', 'Cannot write project to a system directory.', resolved)
    }
  }
  else if (isUnixSystemPath(resolved)) {
    throw new ProjectWritePathError('BLOCKED_SYSTEM_PATH', 'Cannot write project to a system directory.', resolved)
  }

  if (resolved === homeResolved) {
    throw new ProjectWritePathError('BLOCKED_SYSTEM_PATH', 'Cannot write project to home directory root.', resolved)
  }

  return resolved
}

export function resolveArchiveEntryPath(extractRoot: string, entryPath: string): string {
  const normalizedEntry = entryPath.replace(/\\/g, '/')
  if (path.isAbsolute(normalizedEntry)) {
    throw new ProjectWritePathError('ZIP_SLIP', 'Archive entry uses an absolute path.', entryPath)
  }

  const segments = normalizedEntry.split('/')
  if (segments.includes('..')) {
    throw new ProjectWritePathError('ZIP_SLIP', 'Archive entry traverses parent directories.', entryPath)
  }

  const resolvedRoot = path.resolve(extractRoot)
  const resolvedOutput = path.resolve(extractRoot, entryPath)
  const relative = path.relative(resolvedRoot, resolvedOutput)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ProjectWritePathError('ZIP_SLIP', 'Archive entry escapes extract directory.', entryPath)
  }

  return resolvedOutput
}
