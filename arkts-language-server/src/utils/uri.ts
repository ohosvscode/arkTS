export interface UriLike {
  toString(): string
  get fsPath(): string
}

export interface UriLikeConstructor {
  file(path: string): UriLike
  parse(path: string): UriLike
}

export function isContainsInUri<T extends UriLikeConstructor>(fileName: string, directoryPath: string, uri: T): boolean {
  return fileName.startsWith(directoryPath)
    || fileName.startsWith(uri.file(directoryPath).toString())
    || fileName.startsWith(uri.parse(directoryPath).toString())
    || fileName.startsWith(uri.file(directoryPath).fsPath)
    || fileName.startsWith(uri.parse(directoryPath).fsPath)
    || uri.file(directoryPath).fsPath.startsWith(fileName)
    || uri.parse(directoryPath).fsPath.startsWith(fileName)
    || uri.file(directoryPath).toString().startsWith(fileName)
    || uri.parse(directoryPath).toString().startsWith(fileName)
    || uri.file(directoryPath).toString().startsWith(uri.file(fileName).toString())
    || uri.parse(directoryPath).toString().startsWith(uri.parse(fileName).toString())
    || uri.file(directoryPath).toString().startsWith(uri.file(fileName).fsPath)
    || uri.parse(directoryPath).toString().startsWith(uri.parse(fileName).fsPath)
}
