import { Uri } from '@vstils/core'

export namespace UriUtil {
  function looksLikeUri(value: string): boolean {
    return /^[a-z][a-z\d+.-]*:\/\//i.test(value)
  }

  function toUri(value: string): Uri {
    return looksLikeUri(value) ? Uri.parse(value) : Uri.file(value)
  }

  function normalizeFsPath(fsPath: string): string {
    let normalized = fsPath.replaceAll('\\', '/')
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }
    if (/^[a-z]:\//i.test(normalized)) {
      normalized = normalized.toLowerCase()
    }
    return normalized
  }

  function isPathContains(childPath: string, parentPath: string): boolean {
    if (childPath === parentPath) return true
    return childPath.startsWith(`${parentPath}/`)
  }

  export function isContains<CompareFolderUri extends Partial<Uri> & Pick<Uri, 'fsPath' | 'toString' | 'path'>>(uriStr: string, compareFolderUri: CompareFolderUri): boolean {
    const uriPath = normalizeFsPath(toUri(uriStr).fsPath)
    return isPathContains(uriPath, normalizeFsPath(toUri(compareFolderUri.fsPath).fsPath))
      || isPathContains(uriPath, normalizeFsPath(toUri(compareFolderUri.toString()).fsPath))
      || isPathContains(uriPath, normalizeFsPath(toUri(compareFolderUri.path).fsPath))
  }

  export function isEqual(left: string | Uri, right: string | Uri): boolean {
    const leftPath = normalizeFsPath(toUri(typeof left === 'string' ? left : left.toString()).fsPath)
    const rightPath = normalizeFsPath(toUri(typeof right === 'string' ? right : right.toString()).fsPath)
    return leftPath === rightPath
  }
}
