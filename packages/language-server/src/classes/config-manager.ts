import type { EtsServerClientOptions, LanguageServerConfigurator, LanguageServerLogger } from '@arkts/shared'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { SysResource } from '@arkts/shared'
import { loadTsdkByPath } from '@volar/language-server/node'
import defu from 'defu'
import * as ets from 'ohos-typescript'

export class LanguageServerConfigManager implements LanguageServerConfigurator {
  constructor(private readonly logger: LanguageServerLogger) {}

  private config: EtsServerClientOptions = {
    ohos: {
      sdkPath: '',
      hmsSdkPath: '',
      etsComponentPath: '',
      etsLoaderConfigPath: '',
      etsLoaderPath: '',
      baseUrl: '',
      lib: [],
      paths: {},
    },
    typescript: {
      tsdk: '',
    },
    debug: false,
  }

  setDebug(debug: boolean): this {
    this.config.debug = debug
    return this
  }

  getConfiguration(): EtsServerClientOptions {
    return this.config
  }

  setTypeScriptTsdk(tsdk: string): this {
    if (!tsdk || typeof tsdk !== 'string') {
      return this
    }
    this.logger.getConsola().info(`TSDK path changed: new: ${tsdk}, old: ${this.config.typescript.tsdk}`)
    this.config.typescript.tsdk = tsdk
    return this
  }

  private locale: string = ''
  private tsdk: ReturnType<typeof loadTsdkByPath> | undefined

  getTypeScriptTsdk(force: boolean = false): ReturnType<typeof loadTsdkByPath> {
    if (this.tsdk && !force) return this.tsdk
    this.tsdk = loadTsdkByPath(this.config.typescript.tsdk, this.getLocale())
    return this.tsdk
  }

  getTsdkPath(): string {
    return this.config.typescript.tsdk || ''
  }

  setSdkPath(sdkPath: string): this {
    this.logger.getConsola().info(`ohos.sdkPath changed: new: ${sdkPath}, old: ${this.config.ohos.sdkPath}`)
    this.config.ohos.sdkPath = sdkPath
    this.getSysResource(true)
    return this
  }

  getSdkPath(): string {
    return this.config.ohos.sdkPath || ''
  }

  setHmsSdkPath(hmsSdkPath: string): this {
    this.logger.getConsola().info(`ohos.hmsSdkPath changed: new: ${hmsSdkPath}, old: ${this.config.ohos.hmsSdkPath}`)
    this.config.ohos.hmsSdkPath = hmsSdkPath
    return this
  }

  getHmsSdkPath(): string {
    return this.config.ohos.hmsSdkPath || ''
  }

  setEtsComponentPath(etsComponentPath: string): this {
    this.logger.getConsola().info(`ohos.etsComponentPath changed: new: ${etsComponentPath}, old: ${this.config.ohos.etsComponentPath}`)
    this.config.ohos.etsComponentPath = etsComponentPath
    return this
  }

  setEtsLoaderConfigPath(etsLoaderConfigPath: string): this {
    this.logger.getConsola().info(`ohos.etsLoaderConfigPath changed: new: ${etsLoaderConfigPath}, old: ${this.config.ohos.etsLoaderConfigPath}`)
    if (!fs.existsSync(etsLoaderConfigPath)) {
      this.logger.getConsola().warn(`ohos.etsLoaderConfigPath not exists: ${etsLoaderConfigPath}`)
    }
    else if (!fs.statSync(etsLoaderConfigPath).isFile()) {
      this.logger.getConsola().warn(`ohos.etsLoaderConfigPath is not a file: ${etsLoaderConfigPath}`)
    }
    else {
      this.config.ohos.etsLoaderConfigPath = etsLoaderConfigPath
    }
    return this
  }

  getEtsLoaderConfigPath(): string {
    return this.config.ohos.etsLoaderConfigPath || ''
  }

  // Cache the compiler options of the ETS loader config,
  // avoid reading and parsing the file every time (performance)
  private prevEtsLoaderConfigPath: string = ''
  private cachedEtsLoaderConfigCompilerOptions: ets.CompilerOptions = {}
  getEtsLoaderConfigCompilerOptions(): ets.CompilerOptions {
    if (!this.config.ohos.etsLoaderConfigPath) return {}

    if (this.prevEtsLoaderConfigPath === this.config.ohos.etsLoaderConfigPath) return this.cachedEtsLoaderConfigCompilerOptions

    const etsLoaderConfig = fs.readFileSync(this.config.ohos.etsLoaderConfigPath, 'utf-8')
    const parsedConfigFile = ets.parseConfigFileTextToJson(this.config.ohos.etsLoaderConfigPath, etsLoaderConfig)
    const { options = {}, errors = [] } = ets.parseJsonConfigFileContent(
      parsedConfigFile.config,
      ets.sys,
      path.dirname(this.config.ohos.etsLoaderConfigPath),
    )

    if (errors.length > 0) {
      for (const error of errors)
        this.logger.getConsola().warn(`ETS loader config error: [${error.code}:${error.category}] ${error.messageText}`)
    }
    else {
      this.logger.getConsola().info(`ETS loader config parsed successfully, path: ${this.config.ohos.etsLoaderConfigPath}`)
      if (this.logger.getDebug()) this.logger.getConsola().debug(`ETS loader config parsed successfully: ${JSON.stringify(options, null, 2)}`)
    }

    this.prevEtsLoaderConfigPath = this.config.ohos.etsLoaderConfigPath
    this.cachedEtsLoaderConfigCompilerOptions = options
    return options
  }

  setEtsLoaderPath(etsLoaderPath: string): this {
    this.logger.getConsola().info(`ohos.etsLoaderPath changed: new: ${etsLoaderPath}, old: ${this.config.ohos.etsLoaderPath}`)
    this.config.ohos.etsLoaderPath = etsLoaderPath
    return this
  }

  getEtsLoaderPath(): string {
    return this.config.ohos.etsLoaderPath || ''
  }

  setBaseUrl(baseUrl: string): this {
    this.logger.getConsola().info(`ohos.baseUrl changed: new: ${baseUrl}, old: ${this.config.ohos.baseUrl}`)
    this.config.ohos.baseUrl = baseUrl
    return this
  }

  getBaseUrl(): string {
    return this.config.ohos.baseUrl
  }

  setLib(lib: string[]): this {
    this.logger.getConsola().debug(`ohos.lib changed: new: ${lib}, old: ${this.config.ohos.lib}`)
    this.config.ohos.lib = lib
    return this
  }

  getLib(): string[] {
    return this.config.ohos.lib || []
  }

  setPaths(paths: import('ohos-typescript').MapLike<string[]>): this {
    this.logger.getConsola().info(`ohos.paths changed: new: ${JSON.stringify(paths, null, 2)}, old: ${JSON.stringify(this.config.ohos.paths, null, 2)}`)
    this.config.ohos.paths = paths
    return this
  }

  getPaths(): import('ohos-typescript').MapLike<string[]> {
    return this.config.ohos.paths || {}
  }

  setLocale(locale: string): this {
    this.logger.getConsola().info(`locale changed: new: ${locale}, old: ${this.locale}`)
    this.locale = locale
    return this
  }

  getLocale(): string {
    return this.locale
  }

  setConfiguration(config: Partial<EtsServerClientOptions> = {}): this {
    if (config.ohos?.baseUrl) this.setBaseUrl(config.ohos.baseUrl)
    if (config.ohos?.etsComponentPath) this.setEtsComponentPath(config.ohos.etsComponentPath)
    if (config.ohos?.etsLoaderConfigPath) this.setEtsLoaderConfigPath(config.ohos.etsLoaderConfigPath)
    if (config.ohos?.etsLoaderPath) this.setEtsLoaderPath(config.ohos.etsLoaderPath)
    if (config.ohos?.lib) this.setLib(config.ohos.lib)
    if (config.ohos?.paths) this.setPaths(config.ohos.paths)
    if (config.ohos?.sdkPath) this.setSdkPath(config.ohos.sdkPath)
    if (config.typescript?.tsdk) this.setTypeScriptTsdk(config.typescript.tsdk)
    if (config.debug !== undefined) this.setDebug(config.debug)
    return this
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

  getSysResourcePath(): string {
    return path.resolve(this.getSdkPath(), 'ets', 'build-tools', 'ets-loader', 'sysResource.js')
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

  getTsConfig(originalSettings: ets.CompilerOptions): ets.CompilerOptions {
    const finalCompilerOptions = defu(originalSettings, {
      etsLoaderPath: this.getEtsLoaderPath(),
      paths: this.getPaths(),
      lib: this.getLib(),
      baseUrl: this.getBaseUrl(),
      enableStrictCheckOHModule: true,
      skipOhModulesLint: false,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      strict: true,
      strictPropertyInitialization: false,
      incremental: true,
      composite: true,
      moduleDetection: ets.ModuleDetectionKind.Force,
      moduleResolution: ets.ModuleResolutionKind.NodeNext,
      module: ets.ModuleKind.ESNext,
      target: ets.ScriptTarget.ESNext,
      etsAnnotationsEnable: true,
      compatibleSdkVersion: 20,
      packageManagerType: 'ohpm',
      compatibleSdkVersionStage: 'beta2',
      alwaysStrict: true,
      mixCompile: true,
      tsImportSendableEnable: true,
      useUnknownInCatchVariables: false,
    } satisfies ets.CompilerOptions, this.getEtsLoaderConfigCompilerOptions())
    return this.fixTsConfig(finalCompilerOptions)
  }
}
