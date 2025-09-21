import type { OhosClientOptions } from '@arkts/shared'
import type { AbstractWatcher } from '../abstract-watcher'
import type { Translator } from '../translate'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import * as vscode from 'vscode'
import { SdkAnalyzerException } from './sdk-analyzer-exception'

interface ChoiceValidSdkPathStatus<TMetadata extends Record<string, any>> {
  isValid: boolean
  error: unknown
  analyzer: SdkAnalyzer<TMetadata> | undefined
  metadata?: TMetadata
}

interface ChoiceValidSdkPathReturn<TMetadata extends Record<string, any>> {
  choicedAnalyzer: SdkAnalyzer<TMetadata> | undefined
  analyzerStatus: ChoiceValidSdkPathStatus<TMetadata>[]
}

interface ChoiceValidSdkPathOptions<TMetadata extends Record<string, any>> {
  analyzer: SdkAnalyzer<TMetadata> | undefined
  metadata?: TMetadata
}

export class SdkAnalyzer<TMetadata = Record<string, any>> {
  constructor(
    private readonly sdkUri: vscode.Uri,
    private readonly hmsSdkUri: vscode.Uri | undefined,
    private readonly fileSystem: AbstractWatcher,
    private readonly translator: Translator,
    private readonly extraMetadata?: TMetadata,
  ) {}

  static async choiceValidSdkPath<TMetadata extends Record<string, any>>(...analyzers: ChoiceValidSdkPathOptions<TMetadata>[]): Promise<ChoiceValidSdkPathReturn<TMetadata>> {
    const analyzerStatus: ChoiceValidSdkPathStatus<TMetadata>[] = []

    for (let i = 0; i < analyzers.length; i++) {
      if (!analyzers[i].analyzer) {
        analyzerStatus[i] = {
          isValid: false,
          error: new Error(`Analyzer in index ${i}'s ${analyzers[i].metadata?.type || 'unknown'} type is undefined`),
          analyzer: undefined,
          metadata: analyzers[i].metadata,
        }
        continue
      }

      try {
        await analyzers[i].analyzer?.getAnalyzedSdkPath()
        analyzerStatus[i] = {
          isValid: true,
          error: undefined,
          analyzer: analyzers[i].analyzer,
          metadata: analyzers[i].metadata,
        }
      }
      catch (error) {
        analyzerStatus[i] = {
          isValid: false,
          error,
          analyzer: analyzers[i].analyzer,
          metadata: analyzers[i].metadata,
        }
      }
    }

    return {
      choicedAnalyzer: analyzerStatus.find(status => status.isValid)?.analyzer,
      analyzerStatus,
    }
  }

  getExtraMetadata(): TMetadata | undefined {
    return this.extraMetadata
  }

  private isSdkUriExists = false
  /**
   * Get the SDK path.
   *
   * @throws {SdkAnalyzerException} If the SDK path does not exist.
   */
  async getSdkUri(force: boolean = false): Promise<vscode.Uri> {
    if (this.isSdkUriExists && !force)
      return this.sdkUri

    try {
      await this.fileSystem.mustBeDirectory(this.sdkUri, SdkAnalyzerException.Code.SDKPathNotFound, SdkAnalyzerException.Code.SDKPathNotDirectory)
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
    if (this._cachedEtsComponentFolder && !force)
      return this._cachedEtsComponentFolder
    const etsComponentUri = vscode.Uri.joinPath(this.sdkUri, 'ets', 'component')

    try {
      await this.fileSystem.mustBeDirectory(etsComponentUri, SdkAnalyzerException.Code.EtsComponentPathNotFound, SdkAnalyzerException.Code.EtsComponentPathNotDirectory)
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

  private _cachedEtsLoaderConfigPath: vscode.Uri | undefined
  /**
   * Get the `ets/build-tools/ets-loader/tsconfig.json` path.
   *
   * @throws {SdkAnalyzerException} If the `ets/build-tools/ets-loader/tsconfig.json` path does not exist.
   */
  async getEtsLoaderConfigPath(force: boolean = false): Promise<vscode.Uri> {
    if (this._cachedEtsLoaderConfigPath && !force)
      return this._cachedEtsLoaderConfigPath
    const etsLoaderConfigUri = vscode.Uri.joinPath(this.sdkUri, 'ets', 'build-tools', 'ets-loader', 'tsconfig.json')

    try {
      await this.fileSystem.mustBeFile(etsLoaderConfigUri, SdkAnalyzerException.Code.EtsLoaderConfigPathNotFound, SdkAnalyzerException.Code.EtsLoaderConfigPathNotFile)
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

  private getRelativeWithConfigFilePaths(): Record<string, string[]> {
    const currentWorkspaceDir = this.fileSystem.getCurrentWorkspaceDir()
    if (!currentWorkspaceDir)
      return {}

    const buildProfileJson5 = this.fileSystem.readBuildProfileJson5<unknown>()
    if (!buildProfileJson5)
      return {}

    const [buildProfileFilePath, buildProfile] = buildProfileJson5 || []
    if (!buildProfile || !buildProfileFilePath)
      return {}

    if (typeof buildProfile !== 'object' || !buildProfile || !('modules' in buildProfile) || !Array.isArray(buildProfile.modules))
      return {}

    const relativeWithConfigFilePaths: Record<string, string[]> = {}
    for (let i = 0; i < buildProfile.modules.length; i++) {
      const mod: unknown = buildProfile.modules[i]
      if (typeof mod !== 'object' || !mod || !('srcPath' in mod) || typeof mod.srcPath !== 'string')
        continue

      const ohPackageJson5 = this.fileSystem.readOhPackageJson5<unknown>(vscode.Uri.joinPath(currentWorkspaceDir, mod.srcPath))
      if (!ohPackageJson5)
        continue
      const [ohPackageJson5Path, ohPackageJson] = ohPackageJson5
      this.fileSystem.watcher.add(ohPackageJson5Path.fsPath)
      this.fileSystem.getConsola().info(`Listening ${ohPackageJson5Path}`)
      if (typeof ohPackageJson !== 'object' || !ohPackageJson || !('name' in ohPackageJson) || typeof ohPackageJson.name !== 'string')
        continue
      relativeWithConfigFilePaths[ohPackageJson.name] = [
        vscode.Uri.joinPath(currentWorkspaceDir, mod.srcPath).fsPath,
      ]
      relativeWithConfigFilePaths[`${ohPackageJson.name}/*`] = [
        vscode.Uri.joinPath(currentWorkspaceDir, mod.srcPath, '*').fsPath,
      ]
    }
    return relativeWithConfigFilePaths
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
    if (this.isHmsSdkUriExists && !force)
      return this.hmsSdkUri
    if (!this.hmsSdkUri)
      return undefined
    try {
      await this.fileSystem.mustBeDirectory(this.hmsSdkUri, SdkAnalyzerException.Code.HmsSdkPathNotFound, SdkAnalyzerException.Code.HmsSdkPathNotDirectory)
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

  private _cachedHmsApiFolder: vscode.Uri | undefined
  /**
   * Get the `ets/api` folder of the HMS SDK.
   *
   * @param force Whether to force the HMS API folder to be re-obtained.
   * @returns The HMS API folder.
   * @throws {SdkAnalyzerException} If the HMS API folder does not exist.
   */
  async getHmsApiFolder(force: boolean = false): Promise<vscode.Uri | undefined> {
    if (this._cachedHmsApiFolder && !force)
      return this._cachedHmsApiFolder
    const hmsSdkPath = await this.getHmsSdkUri(force)
    if (!hmsSdkPath)
      return undefined
    const hmsApiFolder = vscode.Uri.joinPath(hmsSdkPath, 'ets', 'api')
    try {
      await this.fileSystem.mustBeDirectory(hmsApiFolder, SdkAnalyzerException.Code.HmsApiPathNotFound, SdkAnalyzerException.Code.HmsApiPathNotDirectory)
      this._cachedHmsApiFolder = hmsApiFolder
      return hmsApiFolder
    }
    catch (error) {
      if (error instanceof SdkAnalyzerException) {
        throw SdkAnalyzerException.fromFileSystemException(error, this.translator)
      }
      throw error
    }
  }

  private _cachedHmsKitsFolder: vscode.Uri | undefined
  /**
   * Get the `ets/kits` folder of the HMS SDK.
   *
   * @param force Whether to force the HMS kits folder to be re-obtained.
   * @returns The HMS kits folder.
   * @throws {SdkAnalyzerException} If the HMS kits folder does not exist.
   */
  async getHmsKitsFolder(force: boolean = false): Promise<vscode.Uri | undefined> {
    if (this._cachedHmsKitsFolder && !force)
      return this._cachedHmsKitsFolder
    const hmsSdkPath = await this.getHmsSdkUri(force)
    if (!hmsSdkPath)
      return undefined
    const hmsKitsFolder = vscode.Uri.joinPath(hmsSdkPath, 'ets', 'kits')
    try {
      await this.fileSystem.mustBeDirectory(hmsKitsFolder, SdkAnalyzerException.Code.HmsKitsPathNotFound, SdkAnalyzerException.Code.HmsKitsPathNotDirectory)
      this._cachedHmsKitsFolder = hmsKitsFolder
      return hmsKitsFolder
    }
    catch (error) {
      if (error instanceof SdkAnalyzerException) {
        throw SdkAnalyzerException.fromFileSystemException(error, this.translator)
      }
      throw error
    }
  }

  private getFileNameWithoutExtension(fileNameWithExtension: string): string {
    if (fileNameWithExtension.endsWith('.d.ts') || fileNameWithExtension.endsWith('.d.ets')) {
      return fileNameWithExtension.replace(/\.d\.ts$/, '').replace(/\.d\.ets$/, '')
    }
    return path.basename(fileNameWithExtension, path.extname(fileNameWithExtension))
  }

  private async hmsToTypeScriptCompilerOptionsPaths(force: boolean = false): Promise<import('typescript').MapLike<string[]>> {
    const hmsSdkPath = await this.getHmsSdkUri(force)
    const hmsApiFolder = await this.getHmsApiFolder(force)
    const hmsKitsFolder = await this.getHmsKitsFolder(force)
    if (!hmsSdkPath || !hmsApiFolder || !hmsKitsFolder)
      return {}

    const paths: import('typescript').MapLike<string[]> = {}
    const apiFiles = fs.readdirSync(hmsApiFolder.fsPath)
    const kitsFiles = fs.readdirSync(hmsKitsFolder.fsPath)
    for (const fileNameWithExtension of apiFiles) {
      const fileName = this.getFileNameWithoutExtension(fileNameWithExtension)
      paths[fileName] = [vscode.Uri.joinPath(hmsApiFolder, fileNameWithExtension).fsPath]
      paths[`${fileName}/*`] = [vscode.Uri.joinPath(hmsApiFolder, fileNameWithExtension, '*').fsPath]
    }
    for (const fileNameWithExtension of kitsFiles) {
      const fileName = this.getFileNameWithoutExtension(fileNameWithExtension)
      paths[fileName] = [vscode.Uri.joinPath(hmsKitsFolder, fileNameWithExtension).fsPath]
      paths[`${fileName}/*`] = [vscode.Uri.joinPath(hmsKitsFolder, fileNameWithExtension, '*').fsPath]
    }
    return paths
  }

  /**
   * 根据配置文件检测项目类型和包管理器
   */
  private detectPackageManagerType(): 'npm' | 'ohpm' {
    try {
      const workspaceFolder = this.fileSystem.getCurrentWorkspaceDir()
      if (!workspaceFolder) {
        return 'npm' // 默认回退
      }

      // 检查ArkTS项目标识
      const ohPackageJson5Path = vscode.Uri.joinPath(workspaceFolder, 'oh-package.json5')
      const buildProfilePath = vscode.Uri.joinPath(workspaceFolder, 'build-profile.json5')
      const ohModulesPath = vscode.Uri.joinPath(workspaceFolder, 'oh_modules')
      
      try {
        // 检查oh-package.json5是否存在
        if (fs.existsSync(ohPackageJson5Path.fsPath)) {
          return 'ohpm'
        }
        
        // 检查build-profile.json5是否存在（ArkTS项目）
        if (fs.existsSync(buildProfilePath.fsPath)) {
          return 'ohpm'
        }
        
        // 检查oh_modules目录是否存在
        if (fs.existsSync(ohModulesPath.fsPath)) {
          return 'ohpm'
        }
        
        // 普通TypeScript项目默认使用npm
        return 'npm'
      } catch (fsError) {
        console.warn('文件系统访问错误:', fsError)
        return 'npm' // 文件系统错误时的默认回退
      }
    } catch (error) {
      console.warn('项目类型检测错误:', error)
      return 'npm' // 任何错误的默认回退
    }
  }

  /**
   * Convert the `SdkAnalyzer` to client options.
   *
   * @returns {OhosClientOptions} The client options.
   * @throws {SdkAnalyzerException} If a path is not exists it will throw an error.
   */
  async toOhosClientOptions(force: boolean = false, tsdk?: string): Promise<OhosClientOptions> {
    const sdkPath = await this.getSdkUri(force)
    const etsComponentPath = await this.getEtsComponentFolder(force)
    const etsLoaderConfigPath = await this.getEtsLoaderConfigPath(force)
    const etsLoaderPath = vscode.Uri.joinPath(sdkPath, 'ets', 'build-tools', 'ets-loader')
    const workspaceFolder = this.fileSystem.getCurrentWorkspaceDir()
    
    // 检测包管理器类型
    const packageManagerType = this.detectPackageManagerType()

    // Force load typescript default libs if tsdk is provided (For ArkTS)
    const typescriptDefaultLibs = [
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

    // issue: https://github.com/Groupguanfang/arkTS/pull/68
    const declarationsLib = process.platform === 'win32'
      ? [
          fg.convertPathToPattern(vscode.Uri.joinPath(etsComponentPath, '**', '*.d.ts').fsPath),
          fg.convertPathToPattern(vscode.Uri.joinPath(etsComponentPath, '**', '*.d.ets').fsPath),
          fg.convertPathToPattern(vscode.Uri.joinPath(etsLoaderPath, 'declarations', '**', 'global.d.ts').fsPath),
        ]
      : [
          vscode.Uri.joinPath(etsComponentPath, '**', '*.d.ts').fsPath,
          vscode.Uri.joinPath(etsComponentPath, '**', '*.d.ets').fsPath,
          vscode.Uri.joinPath(etsLoaderPath, 'declarations', '**', 'global.d.ts').fsPath,
        ]

    return {
      sdkPath: sdkPath.fsPath,
      hmsSdkPath: this.hmsSdkUri?.fsPath,
      etsComponentPath: etsComponentPath.fsPath,
      etsLoaderConfigPath: etsLoaderConfigPath.fsPath,
      packageManagerType, // 添加包管理器类型检测
      lib: [
        ...(tsdk ? typescriptDefaultLibs.map(lib => path.join(tsdk, lib)) : []),
        ...fg.sync(declarationsLib, { onlyFiles: true, absolute: true }),
      ].filter(Boolean) as string[],
      typeRoots: [
        workspaceFolder ? vscode.Uri.joinPath(workspaceFolder, 'node_modules', '@types').fsPath : undefined,
        workspaceFolder ? vscode.Uri.joinPath(workspaceFolder, 'oh_modules', '@types').fsPath : undefined,
        vscode.Uri.joinPath(this.sdkUri, 'ets', 'api', '@internal').fsPath,
      ].filter(Boolean) as string[],
      baseUrl: vscode.Uri.joinPath(sdkPath, 'ets').fsPath,
      paths: {
        '*': [
          workspaceFolder ? vscode.Uri.joinPath(workspaceFolder, 'oh_modules', '*').fsPath : undefined,
          './api/*',
          './kits/*',
          './arkts/*',
        ].filter(Boolean) as string[],
        '@internal/full/*': ['./api/@internal/full/*'],
        ...await this.hmsToTypeScriptCompilerOptionsPaths(),
      },
      relativeWithConfigFilePaths: this.getRelativeWithConfigFilePaths(),
      etsLoaderPath: etsLoaderPath.fsPath,
    }
  }
}
