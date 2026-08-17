import type { CreateArkTServiceOptions } from '@arkts/language-service'
import type { LanguageServerLogger } from '@arkts/shared'
import type { Connection, InitializeParams } from '@volar/language-server'
import type { FileSystem } from '@vstils/fs'
import type { CompilerOptions } from 'ohos-typescript'
import type { ProjectDetectorManagerService } from './project-manager'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { SysResource } from '@arkts/shared'
import { createRelativePattern, Uri } from '@vstils/core'
import { FileType } from '@vstils/fs'
import defu from 'defu'
import * as ets from 'ohos-typescript'
import { addHmsPathMapping, hmsDeclarationToModuleNames, hmsEtsWildcardTargets, stripDeclarationExtension } from '../utils/hms-paths'

export class ConfigResolver {
  constructor(
    private readonly logger: LanguageServerLogger,
    private readonly projectDetectorManagerService: ProjectDetectorManagerService,
    private readonly params: InitializeParams,
    private readonly fs: FileSystem,
    private readonly lspRoot: Uri,
    private readonly connection: Connection,
  ) {}

  private isDirectory(uri: Uri): Promise<boolean> {
    return this.fs.stat(uri).then(stat => stat.type === FileType.Directory).catch(() => false)
  }

  private isFile(uri: Uri): Promise<boolean> {
    return this.fs.stat(uri).then(stat => stat.type === FileType.File).catch(() => false)
  }

  private showErrorAndExit(errorMessage: string): this {
    this.logger.getConsola().info(errorMessage)
    this.connection.window.showErrorMessage(errorMessage)
    throw new Error(errorMessage)
    return this
  }

  async validateOrExit(): Promise<this> {
    const sdkPath = this.getSdkPath()
    const hmsPath = this.getHmsSdkPath()
    const etsLoaderPath = this.getEtsLoaderPath()
    const etsLoaderConfigPath = this.getEtsLoaderConfigPath()

    if (!sdkPath || typeof sdkPath !== 'string') {
      return this.showErrorAndExit(`Cannot find ets.sdkPath in initialization options, language server is shutdowning...`)
    }
    if (!await this.isDirectory(Uri.file(sdkPath))) {
      return this.showErrorAndExit(`The ets.sdkPath is not a directory, path: ${sdkPath}, language server is shutdowning...`)
    }
    if (!await this.isDirectory(Uri.file(etsLoaderPath))) {
      return this.showErrorAndExit(`Cannot find ets-loader folder, path: ${etsLoaderPath}, language server is shutdowning...`)
    }
    if (!await this.isFile(Uri.file(etsLoaderConfigPath))) {
      return this.showErrorAndExit(`Cannot find ets-loader tsconfig.json file, path: ${etsLoaderConfigPath}, language server is shutdowning...`)
    }
    if (hmsPath && !await this.isDirectory(Uri.file(hmsPath))) {
      return this.showErrorAndExit(`The ets.hmsPath is not a directory, path: ${hmsPath}, language server is shutdowning...`)
    }
    this.logger.getConsola().info(`ets.sdkPath: ${sdkPath}`)
    this.logger.getConsola().info(`ets.hmsPath: ${hmsPath}`)
    this.logger.getConsola().info(`ets-loader path: ${etsLoaderPath}`)
    this.logger.getConsola().info(`ets-loader tsconfig.json path: ${etsLoaderConfigPath}`)
    return this
  }

  getTsdkPath(): string | undefined {
    return this.params.initializationOptions?.typescript?.tsdk
      ? path.resolve(this.params.initializationOptions?.typescript?.tsdk)
      : undefined
  }

  getSdkPath(): string {
    return this.params.initializationOptions?.ets?.sdkPath
      ? path.resolve(this.params.initializationOptions?.ets?.sdkPath)
      : this.params.initializationOptions?.ets?.sdkPath
  }

  getHmsSdkPath(): string | undefined {
    return this.params.initializationOptions?.ets?.hmsPath
      ? path.resolve(this.params.initializationOptions?.ets?.hmsPath)
      : this.params.initializationOptions?.ets?.hmsPath
  }

  getEtsLoaderPath(): string {
    return path.resolve(this.getSdkPath() ?? process.cwd(), 'ets', 'build-tools', 'ets-loader')
  }

  getEtsLoaderConfigPath(): string {
    return path.resolve(this.getEtsLoaderPath(), 'tsconfig.json')
  }

  async getEtsLoaderConfig(): Promise<import('type-fest').TsConfigJson> {
    const etsLoaderConfigPath = this.getEtsLoaderConfigPath()
    const etsLoaderConfig = await this.fs.readFile(Uri.file(etsLoaderConfigPath))
    const { config = {} } = ets.parseConfigFileTextToJson(etsLoaderConfigPath, etsLoaderConfig.toString())
    return config
  }

  getSysResourcePath(): string {
    return path.resolve(this.getEtsLoaderPath(), 'sysResource.js')
  }

  getBaseUrl(): string {
    return Uri.joinPath(Uri.file(this.getSdkPath()), 'ets').fsPath
  }

  private cachedSysResource: SysResource | null = null

  getSysResource(force: boolean = false): SysResource | null {
    try {
      if (this.cachedSysResource && !force) return this.cachedSysResource
      const sysResourcePath = this.getSysResourcePath()
      const require = createRequire(import.meta.url)
      const sysResource = require(sysResourcePath)
      if (!SysResource.is(sysResource)) return null
      this.cachedSysResource = sysResource
      this.logger.getConsola().info(`Sys resource loaded successfully, path: ${sysResourcePath}`)
      return this.cachedSysResource
    }
    catch (error) {
      this.logger.getConsola().error(`Failed to load sys resource: ${error}`)
      return null
    }
  }

  toArkTSServicesOptions(): CreateArkTServiceOptions {
    return {
      getLocale: () => this.params.locale ?? '',
      getProjectDetectorManager: () => this.projectDetectorManagerService.getProjectDetectorManager(),
      getSdkPath: () => this.getSdkPath(),
      getSysResource: force => this.getSysResource(force),
      getSysResourcePath: () => this.getSysResourcePath(),
    }
  }

  async getTsdkLib(): Promise<string[]> {
    const tsdkPath = this.getTsdkPath()
    if (tsdkPath) {
      const tsdkLibs = await this.fs.glob(createRelativePattern(Uri.joinPath(Uri.file(tsdkPath), 'lib'), '**/*.d.ts')).then(uris => uris.map(uri => uri.fsPath))
      if (tsdkLibs.length > 0) return tsdkLibs
    }
    return await this.fs.glob(createRelativePattern(Uri.joinPath(this.lspRoot, 'lib'), '**/*.d.ts')).then(uris => uris.map(uri => uri.fsPath))
  }

  async getLib(): Promise<string[]> {
    const componentFolderUri = Uri.joinPath(Uri.file(this.getSdkPath()), 'ets', 'component')
    const dtsFiles = await this.fs.glob(createRelativePattern(componentFolderUri, '**/*.d.ts')).then(uris => uris.map(uri => uri.fsPath))
    const detsFiles = await this.fs.glob(createRelativePattern(componentFolderUri, '**/*.d.ets')).then(uris => uris.map(uri => uri.fsPath))

    const declarationsUri = Uri.joinPath(Uri.file(this.getEtsLoaderPath()), 'declarations')
    const globalFiles = await this.fs.glob(createRelativePattern(declarationsUri, '**/*.d.ts')).then(uris => uris.map(uri => uri.fsPath))

    return [...dtsFiles, ...detsFiles, ...globalFiles, ...await this.getHmsComponentLib(), ...await this.getTsdkLib()].filter((item, index, self) => self.indexOf(item) === index && Boolean(item))
  }

  /**
   * HMS UI components (e.g. `HdsNavigationAttribute.titleBar`) live in
   * `ets/component`, same as OpenHarmony built-ins. Without these files in
   * `lib`, `@kit.UIDesignKit` resolves but chained attributes stay unresolved.
   */
  private async getHmsComponentLib(): Promise<string[]> {
    const hmsSdkPath = this.getHmsSdkPath()
    if (!hmsSdkPath) return []
    const hmsComponentFolderUri = Uri.joinPath(Uri.file(hmsSdkPath), 'ets', 'component')
    if (!await this.isDirectory(hmsComponentFolderUri)) return []
    const dtsFiles = await this.fs.glob(createRelativePattern(hmsComponentFolderUri, '**/*.d.ts')).then(uris => uris.map(uri => uri.fsPath))
    const detsFiles = await this.fs.glob(createRelativePattern(hmsComponentFolderUri, '**/*.d.ets')).then(uris => uris.map(uri => uri.fsPath))
    return [...dtsFiles, ...detsFiles]
  }

  private async globHmsDeclarationFiles(folder: Uri): Promise<string[]> {
    if (!await this.isDirectory(folder)) return []
    const dtsFiles = await this.fs.glob(createRelativePattern(folder, '**/*.d.ts')).then(uris => uris.map(uri => uri.fsPath))
    const detsFiles = await this.fs.glob(createRelativePattern(folder, '**/*.d.ets')).then(uris => uris.map(uri => uri.fsPath))
    return [...dtsFiles, ...detsFiles]
  }

  private async mapHmsDeclarationFolder(folder: Uri, paths: import('typescript').MapLike<string[]>): Promise<void> {
    const files = await this.globHmsDeclarationFiles(folder)
    const folderPath = folder.fsPath
    for (const filePath of files) {
      const relativePath = path.relative(folderPath, filePath)
      const wildcardTarget = Uri.joinPath(Uri.file(stripDeclarationExtension(filePath)), '*').fsPath
      for (const moduleName of hmsDeclarationToModuleNames(relativePath))
        addHmsPathMapping(paths, moduleName, filePath, wildcardTarget)
    }
  }

  private async hmsToTypeScriptCompilerOptionsPaths(): Promise<import('typescript').MapLike<string[]>> {
    try {
      const hmsSdkPath = this.getHmsSdkPath()
      if (!hmsSdkPath) return {}
      const hmsEtsFolder = Uri.joinPath(Uri.file(hmsSdkPath), 'ets')
      const paths: import('typescript').MapLike<string[]> = {}
      await this.mapHmsDeclarationFolder(Uri.joinPath(hmsEtsFolder, 'api'), paths)
      await this.mapHmsDeclarationFolder(Uri.joinPath(hmsEtsFolder, 'kits'), paths)
      await this.mapHmsDeclarationFolder(Uri.joinPath(hmsEtsFolder, 'arkts'), paths)
      return paths
    }
    catch (error) {
      this.logger.getConsola().error(`Failed to detect ets.hmsPath, please check the ets.hmsPath in the initialization options: ${error}`)
      if (error instanceof Error) this.logger.getConsola().error(error.stack)
      this.connection.window.showErrorMessage(`Failed to detect ets.hmsPath, please check the ets.hmsPath in the initialization options.`)
      return {}
    }
  }

  async getPaths(): Promise<ets.MapLike<string[]>> {
    const hmsSdkPath = this.getHmsSdkPath()
    const hmsWildcards = hmsSdkPath
      ? hmsEtsWildcardTargets(Uri.joinPath(Uri.file(hmsSdkPath), 'ets').fsPath)
      : []
    return {
      '*': [
        './api/*',
        './kits/*',
        './arkts/*',
        ...hmsWildcards,
      ].filter(Boolean) as string[],
      '@internal/full/*': ['./api/@internal/full/*'],
      ...await this.hmsToTypeScriptCompilerOptionsPaths(),
    }
  }

  /**
   * 将最终合并完成的`compilerOptions`检查一下
   * 看是否缺少必要的配置项，如`ets.syntaxComponents`
   */
  private fixTsConfig(finalCompilerOptions: ets.CompilerOptions): ets.CompilerOptions {
    // 如果没有ets配置则不进行处理
    if (!finalCompilerOptions.ets || typeof finalCompilerOptions.ets !== 'object') return finalCompilerOptions
    // 修复ets.syntaxComponents不存在的问题（可能会在`API10`等API版本中出现）
    // 因为插件同步的是最新版的`ohos-typescript`，而`ets.syntaxComponents`在API10这些老API版本里是不存在的 因此应当补齐一下相关配置
    if (!finalCompilerOptions.ets.syntaxComponents || typeof finalCompilerOptions.ets.syntaxComponents !== 'object') {
      finalCompilerOptions.ets.syntaxComponents = {
        paramsUICallback: [
          'ForEach',
          'LazyForEach',
        ],
        attrUICallback: [
          {
            name: 'Repeat',
            attributes: ['each', 'template'],
          },
        ],
      }
    }
    return finalCompilerOptions
  }

  async toCompilationSettings(originalSettings?: CompilerOptions): Promise<CompilerOptions> {
    const etsLoaderConfig = await this.getEtsLoaderConfig()
    const compilerOptions = defu<CompilerOptions, Array<CompilerOptions>>(
      this.params.initializationOptions?.compilerOptions ?? {},
      {
        etsLoaderPath: this.getEtsLoaderPath(),
        lib: await this.getLib(),
        paths: await this.getPaths(),
        baseUrl: this.getBaseUrl(),
        module: ets.ModuleKind.ESNext,
        target: ets.ScriptTarget.ESNext,
        moduleDetection: ets.ModuleDetectionKind.Force,
        moduleResolution: ets.ModuleResolutionKind.NodeNext,
        incremental: true,
        strict: true,
        strictPropertyInitialization: false,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        skipOhModulesLint: false,
        enableStrictCheckOHModule: true,
        etsAnnotationsEnable: true,
        compatibleSdkVersion: 20,
        packageManagerType: 'ohpm',
        compatibleSdkVersionStage: 'beta2',
        alwaysStrict: true,
        mixCompile: true,
        tsImportSendableEnable: true,
        useUnknownInCatchVariables: false,
      },
      etsLoaderConfig.compilerOptions as ets.CompilerOptions,
      originalSettings ?? {},
    )
    return this.fixTsConfig(compilerOptions)
  }
}
