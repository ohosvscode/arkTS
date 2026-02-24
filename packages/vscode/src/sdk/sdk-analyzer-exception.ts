import type { Translator } from 'unioc/vscode'
import { FileSystemException } from '../errors/file-system-exception'

export class SdkAnalyzerException extends FileSystemException {
  constructor(public code: SdkAnalyzerException.SdkAnalyzerExceptionCode, public translator: Translator) {
    super(code, translator.t(`sdk.error.${Object.keys(SdkAnalyzerException.SdkAnalyzerExceptionCode)[Object.values(SdkAnalyzerException.SdkAnalyzerExceptionCode).indexOf(code)]}`))
  }

  /**
   * Convert the `FileSystemException` to `SdkAnalyzerException`.
   *
   * @param {FileSystemException} error The `FileSystemException` to convert.
   * @returns {SdkAnalyzerException} The converted `SdkAnalyzerException`.
   */
  static fromFileSystemException(error: FileSystemException, translator: Translator): SdkAnalyzerException {
    return new SdkAnalyzerException(error.code as SdkAnalyzerException.SdkAnalyzerExceptionCode, translator)
  }
}

export namespace SdkAnalyzerException {
  export enum SdkAnalyzerExceptionCode {
    SDKPathNotFound = 'SDK_PATH_NOT_FOUND',
    SDKPathNotDirectory = 'SDK_PATH_NOT_DIRECTORY',
    EtsComponentPathNotFound = 'ETS_COMPONENT_PATH_NOT_FOUND',
    EtsComponentPathNotDirectory = 'ETS_COMPONENT_PATH_NOT_DIRECTORY',
    EtsLoaderConfigPathNotFound = 'ETS_LOADER_CONFIG_PATH_NOT_FOUND',
    EtsLoaderConfigPathNotFile = 'ETS_LOADER_CONFIG_PATH_NOT_FILE',
    HmsSdkPathNotFound = 'HMS_SDK_PATH_NOT_FOUND',
    HmsSdkPathNotDirectory = 'HMS_SDK_PATH_NOT_DIRECTORY',
    HmsApiPathNotFound = 'HMS_API_PATH_NOT_FOUND',
    HmsApiPathNotDirectory = 'HMS_API_PATH_NOT_DIRECTORY',
    HmsKitsPathNotFound = 'HMS_KITS_PATH_NOT_FOUND',
    HmsKitsPathNotDirectory = 'HMS_KITS_PATH_NOT_DIRECTORY',
  }
}
