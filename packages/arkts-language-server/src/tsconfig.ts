import type ArkTS from 'ohos-typescript'

export interface TsConfigPatcherOptions {
  /**
   * The ArkTS instance (ohos-typescript).
   */
  readonly arkts: typeof ArkTS
  /**
   * The original compilation settings.
   */
  readonly originalCompilationSettings?: ArkTS.CompilerOptions
}

export interface TsConfigPatcher {
  /**
   * Get the merged compiler options.
   */
  toCompilerOptions(): ArkTS.CompilerOptions
}

const staticCompilerOptions: ArkTS.CompilerOptions = {
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
  paths: {
    '*': [
      './api/*',
      './kits/*',
      './arkts/*',
    ].filter(Boolean) as string[],
    '@internal/full/*': ['./api/@internal/full/*'],
  },
}

export function createTsConfigPatcher(options: TsConfigPatcherOptions): TsConfigPatcher {
  const defaultCompilerOptions: ArkTS.CompilerOptions = {
    module: options.arkts.ModuleKind.ESNext,
    target: options.arkts.ScriptTarget.ESNext,
    moduleDetection: options.arkts.ModuleDetectionKind.Force,
    moduleResolution: options.arkts.ModuleResolutionKind.NodeNext,
  }

  let cachedCompilerOptions: ArkTS.CompilerOptions | undefined

  return {
    toCompilerOptions: () => cachedCompilerOptions ??= fixTsConfig({
      ...options.originalCompilationSettings,
      ...defaultCompilerOptions,
      ...staticCompilerOptions,
    }),
  }
}

function fixTsConfig(compilerOptions: ArkTS.CompilerOptions): ArkTS.CompilerOptions {
  // 如果没有ets配置则不进行处理
  if (!compilerOptions.ets || typeof compilerOptions.ets !== 'object') return compilerOptions
  // 修复ets.syntaxComponents不存在的问题（可能会在`API10`等API版本中出现）
  // 因为插件同步的是最新版的`ohos-typescript`，而`ets.syntaxComponents`在API10这些老API版本里是不存在的 因此应当补齐一下相关配置
  if (!compilerOptions.ets.syntaxComponents || typeof compilerOptions.ets.syntaxComponents !== 'object') {
    compilerOptions.ets.syntaxComponents = {
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
  return compilerOptions
}
