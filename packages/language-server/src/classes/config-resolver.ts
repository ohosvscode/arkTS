import type { CreateArkTServiceOptions } from '@arkts/language-service'
import type { LanguageServerLogger } from '@arkts/shared'
import type { Connection, InitializeParams } from '@volar/language-server'
import type { FileSystemRegistry } from '@vstils/fs'
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

export class ConfigResolver {
  constructor(
    private readonly logger: LanguageServerLogger,
    private readonly projectDetectorManagerService: ProjectDetectorManagerService,
    private readonly params: InitializeParams,
    private readonly fs: FileSystemRegistry['fs'],
    private readonly lspRoot: Uri,
    private readonly connection: Connection,
  ) {}

  private isDirectory(uri: Uri): Promise<boolean> {
    return this.fs.stat(uri).then(stat => stat.type === FileType.Directory).catch(() => false)
  }

  async validateOrExit(): Promise<this> {
    if (!this.getSdkPath() || typeof this.getSdkPath() !== 'string') {
      const errorMessage = `Cannot find ets.sdkPath in initialization options, language server is shutdowning...`
      this.logger.getConsola().info(errorMessage)
      this.connection.window.showErrorMessage(errorMessage)
      throw new Error(errorMessage)
    }
    if (!await this.isDirectory(Uri.file(this.getSdkPath()))) {
      const errorMessage = `The ets.sdkPath is not a directory, path: ${this.getSdkPath()}, language server is shutdowning...`
      this.logger.getConsola().info(errorMessage)
      this.connection.window.showErrorMessage(errorMessage)
      throw new Error(errorMessage)
    }
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
    const etsLoaderConfig = await this.fs.readFile(Uri.file(etsLoaderConfigPath)).then(buffer => buffer.toString())
    const { config = {} } = ets.parseConfigFileTextToJson(etsLoaderConfigPath, etsLoaderConfig)
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

    return [...dtsFiles, ...detsFiles, ...globalFiles, ...await this.getTsdkLib()].filter((item, index, self) => self.indexOf(item) === index && Boolean(item))
  }

  private getFileNameWithoutExtension(fileNameWithExtension: string): string {
    if (fileNameWithExtension.endsWith('.d.ts') || fileNameWithExtension.endsWith('.d.ets')) {
      return fileNameWithExtension.replace(/\.d\.ts$/, '').replace(/\.d\.ets$/, '')
    }
    return path.basename(fileNameWithExtension, path.extname(fileNameWithExtension))
  }

  private async hmsToTypeScriptCompilerOptionsPaths(): Promise<import('typescript').MapLike<string[]>> {
    try {
      const hmsSdkPath = this.getHmsSdkPath()
      if (!hmsSdkPath) return {}
      const hmsApiFolder = Uri.joinPath(Uri.file(hmsSdkPath), 'ets', 'api')
      const hmsKitsFolder = Uri.joinPath(Uri.file(hmsSdkPath), 'ets', 'kits')
      if (!hmsApiFolder || !hmsKitsFolder) return {}

      const paths: import('typescript').MapLike<string[]> = {}
      const apiFiles = await this.fs.readDirectory(hmsApiFolder)
      const kitsFiles = await this.fs.readDirectory(hmsKitsFolder)
      for (const [fileNameWithExtension, fileType] of apiFiles) {
        if (fileType !== FileType.File) continue
        const fileName = this.getFileNameWithoutExtension(fileNameWithExtension)
        paths[fileName] = [Uri.joinPath(hmsApiFolder, fileNameWithExtension).fsPath]
        paths[`${fileName}/*`] = [Uri.joinPath(hmsApiFolder, fileNameWithExtension, '*').fsPath]
      }
      for (const [fileNameWithExtension, fileType] of kitsFiles) {
        if (fileType !== FileType.File) continue
        const fileName = this.getFileNameWithoutExtension(fileNameWithExtension)
        paths[fileName] = [Uri.joinPath(hmsKitsFolder, fileNameWithExtension).fsPath]
        paths[`${fileName}/*`] = [Uri.joinPath(hmsKitsFolder, fileNameWithExtension, '*').fsPath]
      }
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
    return {
      '*': [
        './api/*',
        './kits/*',
        './arkts/*',
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
