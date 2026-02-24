export class FileSystemException extends Error {
  constructor(public code: number | string, message?: string) {
    super(message)
  }
}

export namespace FileSystemException {
  export enum FileSystemExceptionCode {
    FileNotFound = 'FILE_NOT_FOUND',
  }
}
