import type { Translator } from 'unioc/vscode'
import type { SdkVersionGuesser } from './sdk-guesser'
import type { SdkManager } from './sdk-manager'
import path from 'node:path'
import * as vscode from 'vscode'
import { FileSystemException } from '../errors/file-system-exception'
import { SdkAnalyzerException } from './sdk-analyzer-exception'

interface ChoiceValidSdkPathStatus {
  isValid: boolean
  error: unknown
  analyzer: SdkAnalyzer | undefined
  identifier?: SdkAnalyzer.Identifier
}

interface ChoiceValidSdkPathReturn {
  choicedAnalyzer: SdkAnalyzer | undefined
  analyzerStatus: ChoiceValidSdkPathStatus[]
}

export class SdkAnalyzer {
  private constructor(
    private readonly sdkUri: vscode.Uri,
    private readonly hmsSdkUri: vscode.Uri | undefined,
    private readonly translator: Translator,
    private readonly identifier: SdkAnalyzer.Identifier,
  ) {}

  public static readonly tsdkDefaultLibraries = [
    'lib.d.ts',
    'lib.decorators.legacy.d.ts', // Using legacy decorators
    // 'lib.dom.asynciterable.d.ts', // Exclude dom lib
    // 'lib.dom.d.ts', // Exclude dom lib
    // 'lib.dom.iterable.d.ts', // Exclude dom lib
    'lib.es5.d.ts',
    'lib.es6.d.ts',
    'lib.es2015.collection.d.ts',
    'lib.es2015.core.d.ts',
    'lib.es2015.d.ts',
    'lib.es2015.generator.d.ts',
    'lib.es2015.iterable.d.ts',
    'lib.es2015.promise.d.ts',
    'lib.es2015.proxy.d.ts',
    'lib.es2015.reflect.d.ts',
    'lib.es2015.symbol.d.ts',
    'lib.es2015.symbol.wellknown.d.ts',
    'lib.es2016.array.include.d.ts',
    'lib.es2016.d.ts',
    'lib.es2016.full.d.ts',
    'lib.es2016.intl.d.ts',
    'lib.es2017.arraybuffer.d.ts',
    'lib.es2017.d.ts',
    'lib.es2017.date.d.ts',
    'lib.es2017.full.d.ts',
    'lib.es2017.intl.d.ts',
    'lib.es2017.object.d.ts',
    'lib.es2017.sharedmemory.d.ts',
    'lib.es2017.string.d.ts',
    'lib.es2017.typedarrays.d.ts',
    'lib.es2018.asyncgenerator.d.ts',
    'lib.es2018.asynciterable.d.ts',
    'lib.es2018.d.ts',
    'lib.es2018.full.d.ts',
    'lib.es2018.intl.d.ts',
    'lib.es2018.promise.d.ts',
    'lib.es2018.regexp.d.ts',
    'lib.es2019.array.d.ts',
    'lib.es2019.d.ts',
    'lib.es2019.full.d.ts',
    'lib.es2019.intl.d.ts',
    'lib.es2019.object.d.ts',
    'lib.es2019.string.d.ts',
    'lib.es2019.symbol.d.ts',
    'lib.es2020.bigint.d.ts',
    'lib.es2020.d.ts',
    'lib.es2020.date.d.ts',
    'lib.es2020.full.d.ts',
    'lib.es2020.intl.d.ts',
    'lib.es2020.number.d.ts',
    'lib.es2020.promise.d.ts',
    'lib.es2020.sharedmemory.d.ts',
    'lib.es2020.string.d.ts',
    'lib.es2020.symbol.wellknown.d.ts',
  ]

  static async choiceValidSdkPath(...analyzers: (SdkAnalyzer | SdkAnalyzer.NotFoundError)[]): Promise<ChoiceValidSdkPathReturn> {
    const analyzerStatus: ChoiceValidSdkPathStatus[] = []

    for (let i = 0; i < analyzers.length; i++) {
      const currentAnalyzer = analyzers[i]
      if (currentAnalyzer instanceof SdkAnalyzer.NotFoundError) {
        analyzerStatus[i] = {
          isValid: false,
          error: analyzers[i],
          analyzer: undefined,
          identifier: analyzers[i].getIdentifier(),
        }
        continue
      }

      try {
        await currentAnalyzer.getAnalyzedSdkPath()
        analyzerStatus[i] = {
          isValid: true,
          error: undefined,
          analyzer: currentAnalyzer,
          identifier: currentAnalyzer.getIdentifier(),
        }
      }
      catch (error) {
        analyzerStatus[i] = {
          isValid: false,
          error,
          analyzer: currentAnalyzer,
          identifier: currentAnalyzer.getIdentifier(),
        }
      }
    }

    return {
      choicedAnalyzer: analyzerStatus.find(status => status.isValid)?.analyzer,
      analyzerStatus,
    }
  }

  static fromSdkManager(sdkManager: SdkManager, sdkUri: vscode.Uri, hmsSdkUri: vscode.Uri | undefined, identifier: SdkAnalyzer.Identifier): SdkAnalyzer {
    return new SdkAnalyzer(
      sdkUri,
      hmsSdkUri,
      sdkManager.translator,
      identifier,
    )
  }

  static async getUserDefinedSdkPath(type: 'workspace' | 'global'): Promise<string | undefined> {
    const inspectedConfiguration = vscode.workspace.getConfiguration('ets').inspect<string>('sdkPath') || {} as ReturnType<ReturnType<typeof vscode.workspace.getConfiguration>['inspect']>
    if (type === 'workspace' && typeof inspectedConfiguration?.workspaceValue === 'string') return inspectedConfiguration.workspaceValue
    if (type === 'global' && typeof inspectedConfiguration?.globalValue === 'string') return inspectedConfiguration.globalValue
  }

  static async createLocalSdkAnalyzer(sdkManager: SdkManager, sdkVersionGuesser: SdkVersionGuesser): Promise<SdkAnalyzer | SdkAnalyzer.NotFoundError> {
    const localSdkPath = await sdkManager.getOhosSdkPathFromLocalProperties()
    const [, numbericSdkVersion] = await sdkVersionGuesser.getGuessedOhosSdkVersion() || []
    if (!localSdkPath || !numbericSdkVersion) return new SdkAnalyzer.NotFoundError('local', sdkManager.translator)
    const sdkUri = vscode.Uri.file(path.resolve(localSdkPath, numbericSdkVersion.toString()))
    return this.fromSdkManager(sdkManager, sdkUri, await sdkManager.getAnalyzedHmsSdkPath(), 'local')
  }

  static async createWorkspaceSdkAnalyzer(sdkManager: SdkManager): Promise<SdkAnalyzer | SdkAnalyzer.NotFoundError> {
    const sdkPath = await this.getUserDefinedSdkPath('workspace')
    if (!sdkPath) return new SdkAnalyzer.NotFoundError('workspace', sdkManager.translator)
    const sdkUri = vscode.Uri.file(sdkPath)
    return this.fromSdkManager(sdkManager, sdkUri, await sdkManager.getAnalyzedHmsSdkPath(), 'workspace')
  }

  static async createGlobalSdkAnalyzer(sdkManager: SdkManager): Promise<SdkAnalyzer | SdkAnalyzer.NotFoundError> {
    const sdkPath = await this.getUserDefinedSdkPath('global')
    if (!sdkPath) return new SdkAnalyzer.NotFoundError('global', sdkManager.translator)
    const sdkUri = vscode.Uri.file(sdkPath)
    return this.fromSdkManager(sdkManager, sdkUri, await sdkManager.getAnalyzedHmsSdkPath(), 'global')
  }

  private isSdkUriExists = false
  /**
   * Get the SDK path.
   *
   * @throws {SdkAnalyzerException} If the SDK path does not exist.
   */
  async getSdkUri(force: boolean = false): Promise<vscode.Uri> {
    if (this.isSdkUriExists && !force) return this.sdkUri

    try {
      const statInfo = await vscode.workspace.fs.stat(this.sdkUri).then(
        statInfo => statInfo,
        () => undefined,
      )
      if (!statInfo) throw new FileSystemException(SdkAnalyzerException.SdkAnalyzerExceptionCode.SDKPathNotFound, `Path ${this.sdkUri.fsPath} does not exist.`)
      if (statInfo.type !== vscode.FileType.Directory) throw new FileSystemException(SdkAnalyzerException.SdkAnalyzerExceptionCode.SDKPathNotDirectory, `Path ${this.sdkUri.fsPath} is not a directory.`)
      this.isSdkUriExists = true
      return this.sdkUri
    }
    catch (error) {
      if (error instanceof SdkAnalyzerException) {
        throw SdkAnalyzerException.fromFileSystemException(error, this.translator)
      }
      throw error
    }
  }

  private _cachedEtsComponentFolder: vscode.Uri | undefined
  /**
   * Get the `ets/component` folder of the SDK.
   *
   * @throws {SdkAnalyzerException} If the `ets/component` folder does not exist.
   */
  async getEtsComponentFolder(force: boolean = false): Promise<vscode.Uri> {
    if (this._cachedEtsComponentFolder && !force) return this._cachedEtsComponentFolder
    const etsComponentUri = vscode.Uri.joinPath(this.sdkUri, 'ets', 'component')

    try {
      const statInfo = await vscode.workspace.fs.stat(etsComponentUri).then(
        statInfo => statInfo,
        () => undefined,
      )
      if (!statInfo) throw new FileSystemException(SdkAnalyzerException.SdkAnalyzerExceptionCode.EtsComponentPathNotFound, `Path ${etsComponentUri.fsPath} does not exist.`)
      if (statInfo.type !== vscode.FileType.Directory) throw new FileSystemException(SdkAnalyzerException.SdkAnalyzerExceptionCode.EtsComponentPathNotDirectory, `Path ${etsComponentUri.fsPath} is not a directory.`)
      this._cachedEtsComponentFolder = etsComponentUri
      return etsComponentUri
    }
    catch (error) {
      if (error instanceof SdkAnalyzerException) {
        throw SdkAnalyzerException.fromFileSystemException(error, this.translator)
      }
      throw error
    }
  }

  async getAnalyzedSdkPath(): Promise<vscode.Uri | SdkAnalyzerException> {
    try {
      const sdkUri = await this.getSdkUri()
      await this.getEtsComponentFolder()
      await this.getEtsLoaderConfigPath()
      return sdkUri
    }
    catch (error) {
      if (error instanceof SdkAnalyzerException) {
        return SdkAnalyzerException.fromFileSystemException(error, this.translator)
      }
      throw error
    }
  }

  async isValidSdkPath(): Promise<boolean> {
    try {
      await this.getSdkUri()
      await this.getEtsComponentFolder()
      await this.getEtsLoaderConfigPath()
      return true
    }
    catch {
      return false
    }
  }

  getIdentifier(): SdkAnalyzer.Identifier {
    return this.identifier
  }

  private _cachedEtsLoaderConfigPath: vscode.Uri | undefined
  /**
   * Get the `ets/build-tools/ets-loader/tsconfig.json` path.
   *
   * @throws {SdkAnalyzerException} If the `ets/build-tools/ets-loader/tsconfig.json` path does not exist.
   */
  async getEtsLoaderConfigPath(force: boolean = false): Promise<vscode.Uri> {
    if (this._cachedEtsLoaderConfigPath && !force) return this._cachedEtsLoaderConfigPath
    const etsLoaderConfigUri = vscode.Uri.joinPath(this.sdkUri, 'ets', 'build-tools', 'ets-loader', 'tsconfig.json')

    try {
      const statInfo = await vscode.workspace.fs.stat(etsLoaderConfigUri).then(
        statInfo => statInfo,
        () => undefined,
      )
      if (!statInfo) throw new FileSystemException(SdkAnalyzerException.SdkAnalyzerExceptionCode.EtsLoaderConfigPathNotFound, `Path ${etsLoaderConfigUri.fsPath} does not exist.`)
      if (statInfo.type !== vscode.FileType.File) throw new FileSystemException(SdkAnalyzerException.SdkAnalyzerExceptionCode.EtsLoaderConfigPathNotFile, `Path ${etsLoaderConfigUri.fsPath} is not a file.`)
      this._cachedEtsLoaderConfigPath = etsLoaderConfigUri
      return etsLoaderConfigUri
    }
    catch (error) {
      if (error instanceof SdkAnalyzerException) {
        throw SdkAnalyzerException.fromFileSystemException(error, this.translator)
      }
      throw error
    }
  }

  private isHmsSdkUriExists = false
  /**
   * Get the HMS SDK path.
   *
   * @param force Whether to force the HMS SDK path to be re-obtained.
   * @returns The HMS SDK path.
   * @throws {SdkAnalyzerException} If the HMS SDK path does not exist.
   */
  async getHmsSdkUri(force: boolean = false): Promise<vscode.Uri | undefined> {
    if (this.isHmsSdkUriExists && !force) return this.hmsSdkUri
    if (!this.hmsSdkUri) return undefined
    try {
      const statInfo = await vscode.workspace.fs.stat(this.hmsSdkUri).then(
        statInfo => statInfo,
        () => undefined,
      )
      if (!statInfo) throw new FileSystemException(SdkAnalyzerException.SdkAnalyzerExceptionCode.HmsSdkPathNotFound, `Path ${this.hmsSdkUri.fsPath} does not exist.`)
      if (statInfo.type !== vscode.FileType.Directory) throw new FileSystemException(SdkAnalyzerException.SdkAnalyzerExceptionCode.HmsSdkPathNotDirectory, `Path ${this.hmsSdkUri.fsPath} is not a directory.`)
      this.isHmsSdkUriExists = true
      return this.hmsSdkUri
    }
    catch (error) {
      if (error instanceof SdkAnalyzerException) {
        throw SdkAnalyzerException.fromFileSystemException(error, this.translator)
      }
      throw error
    }
  }
}

export namespace SdkAnalyzer {
  export type Identifier = 'local' | 'workspace' | 'global'

  export class NotFoundError extends SdkAnalyzerException {
    constructor(private readonly identifier: SdkAnalyzer.Identifier, translator: Translator) {
      super(SdkAnalyzerException.SdkAnalyzerExceptionCode.SDKPathNotFound, translator)
      this.message = `SDK analyzer with identifier ${identifier} not found, please check your ${identifier} configuration.`
    }

    getIdentifier(): SdkAnalyzer.Identifier {
      return this.identifier
    }
  }
}
