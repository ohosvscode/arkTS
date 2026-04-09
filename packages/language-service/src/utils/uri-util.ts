import type { Uri } from '@vstils/core'

export namespace UriUtil {
  export function isContains<CompareFolderUri extends Partial<Uri> & Pick<Uri, 'fsPath' | 'toString' | 'path'>>(uriStr: string, compareFolderUri: CompareFolderUri): boolean {
    return uriStr.startsWith(compareFolderUri.fsPath)
      || uriStr.startsWith(compareFolderUri.toString())
      || uriStr.startsWith(compareFolderUri.path)
  }
}
