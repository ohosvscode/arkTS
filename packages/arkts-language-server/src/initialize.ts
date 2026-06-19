import type { ProjectContext } from '@volar/language-server'
import type { InitializeParams } from '@volar/vscode'
import type ArkTS from 'ohos-typescript'
import type { URI } from 'vscode-uri'
import type { LibraryScanner } from './library-scanner'
import type { VolarServer } from './types'
import { FileType } from '@volar/language-server'
import defu from 'defu'
import { Utils } from 'vscode-uri'
import { FileSystemTryReader } from './file-system'
import { createLibraryScanner } from './library-scanner'
import { createTsConfigPatcher } from './tsconfig'

export interface ArkTSInitializer {
  /**
   * Patch the project context.
   */
  patchProject(project: ProjectContext): void
}

type StrictInitializeParams = Omit<InitializeParams, 'initializationOptions'> & {
  initializationOptions?: unknown
}

class ArkTSInitializerImpl implements ArkTSInitializer {
  readonly fsr: FileSystemTryReader

  constructor(
    private readonly server: VolarServer,
    private readonly arkts: typeof ArkTS,
    private readonly type: 'node' | 'browser',
  ) {
    this.fsr = new FileSystemTryReader(server)
  }

  showErrorAndExit(errorMessage: string): this {
    this.server.connection.window.showErrorMessage(errorMessage)
    throw new Error(errorMessage)
  }

  static readonly EXAMPLE_ERROR = `\`\`\`json
{
  "ets": {
    "sdkPath": "path/to/your/openharmony/sdk"
  }
}
\`\`\`
`

  static readonly ETS_MISSING_OR_INVALID_ERROR = `Initialization options must contain a "ets" property and it must be an object.

For basically, the initialization options should be like this:
${ArkTSInitializerImpl.EXAMPLE_ERROR}
`

  static readonly SDK_PATH_MISSING_OR_INVALID_ERROR = `The "sdkPath" property in the "ets" object is required and must be a string.

For example:
${ArkTSInitializerImpl.EXAMPLE_ERROR}
`

  static readonly SDK_PATH_NOT_EXISTS_OR_NOT_DIRECTORY_ERROR = `The OpenHarmony SDK path (ets.sdkPath) does not exist or is not a directory.`
  static readonly TSCONFIG_NOT_FOUND_ERROR = `The tsconfig.json file is not found in the OpenHarmony SDK path (ets.sdkPath). Please make sure the tsconfig.json file is under the "[ets.sdkPath]/ets/build-tools/ets-loader" directory.`

  public etsLoaderTsConfigContent: import('ohos-typescript').CompilerOptions | undefined
  public etsLoaderTsConfigUri: URI | undefined
  public sdkDirectoryUri: URI | undefined
  public libraryScanner: LibraryScanner | undefined

  async patchProject(project: ProjectContext): Promise<void> {
    if (!project.typescript || !this.sdkDirectoryUri || !this.etsLoaderTsConfigContent) return
    const originalCompilationSettings = defu(
      project.typescript.languageServiceHost.getCompilationSettings(),
      this.etsLoaderTsConfigContent,
      {
        baseUrl: this.sdkDirectoryUri ? this.type === 'node' ? Utils.joinPath(this.sdkDirectoryUri, 'ets').fsPath : Utils.joinPath(this.sdkDirectoryUri, 'ets').toString() : '',
        lib: this.libraryScanner?.getLibraries() ?? [],
      } satisfies ArkTS.CompilerOptions,
    ) as ArkTS.CompilerOptions
    if (typeof originalCompilationSettings.configFilePath === 'string' && this.etsLoaderTsConfigUri) {
      originalCompilationSettings.configFilePath = this.type === 'node' ? this.etsLoaderTsConfigUri.fsPath : this.etsLoaderTsConfigUri.toString()
    }
    console.warn(`[ArkTSInitializer] Original compilation settings: ${JSON.stringify(originalCompilationSettings, null, 2)}`)
    const patcher = createTsConfigPatcher({ originalCompilationSettings, arkts: this.arkts })
    project.typescript.languageServiceHost.getCompilationSettings = () => patcher.toCompilerOptions() as import('typescript').CompilerOptions
    project.typescript.languageServiceHost.getScriptKind = ((fileName: string): ArkTS.ScriptKind => {
      if (fileName.endsWith('.ets')) return this.arkts.ScriptKind.ETS
      else if (fileName.endsWith('.js')) return this.arkts.ScriptKind.JS
      else if (fileName.endsWith('.jsx')) return this.arkts.ScriptKind.JSX
      else if (fileName.endsWith('.ts')) return this.arkts.ScriptKind.TS
      else if (fileName.endsWith('.tsx')) return this.arkts.ScriptKind.TSX
      else if (fileName.endsWith('.json') || fileName.endsWith('.json5') || fileName.endsWith('.jsonc')) return this.arkts.ScriptKind.JSON
      else return this.arkts.ScriptKind.Unknown
    }) as (fileName: string) => import('typescript').ScriptKind
  }
}

export async function createArkTSInitializer(
  server: VolarServer,
  arkts: typeof ArkTS,
  params: StrictInitializeParams,
  type: 'node' | 'browser',
  fileUri: string,
): Promise<ArkTSInitializer> {
  const initializer = new ArkTSInitializerImpl(server, arkts, type)
  console.warn(`[ArkTSInitializer] Initialization options: ${JSON.stringify(params.initializationOptions, null, 2)}`)

  if (typeof params.initializationOptions !== 'object' || params.initializationOptions === null) return initializer.showErrorAndExit('Initialization options is required and must be an object.')
  if (!('ets' in params.initializationOptions) || typeof params.initializationOptions.ets !== 'object' || params.initializationOptions.ets === null) return initializer.showErrorAndExit(ArkTSInitializerImpl.ETS_MISSING_OR_INVALID_ERROR)
  if (!('sdkPath' in params.initializationOptions.ets) || typeof params.initializationOptions.ets.sdkPath !== 'string') return initializer.showErrorAndExit(ArkTSInitializerImpl.SDK_PATH_MISSING_OR_INVALID_ERROR)

  const [sdkDirectoryStat, sdkDirectoryUri] = await initializer.fsr.tryStatByString(params.initializationOptions.ets.sdkPath) ?? []
  if (!sdkDirectoryStat || !sdkDirectoryUri || sdkDirectoryStat.type !== FileType.Directory) return initializer.showErrorAndExit(ArkTSInitializerImpl.SDK_PATH_NOT_EXISTS_OR_NOT_DIRECTORY_ERROR)

  const [tsConfigContent, tsConfigUri] = await initializer.fsr.tryJoinPathAndReadFileByString(params.initializationOptions.ets.sdkPath, 'ets', 'build-tools', 'ets-loader', 'tsconfig.json') ?? []
  if (!tsConfigContent || !tsConfigUri) return initializer.showErrorAndExit(ArkTSInitializerImpl.TSCONFIG_NOT_FOUND_ERROR)

  const { config = {}, error } = arkts.parseConfigFileTextToJson(tsConfigUri.toString(), tsConfigContent)
  if (error) server.connection.console.warn(`[ETS${error.code}] ${error.messageText}`)
  initializer.etsLoaderTsConfigContent = config?.compilerOptions ?? {}
  initializer.etsLoaderTsConfigUri = tsConfigUri
  initializer.sdkDirectoryUri = sdkDirectoryUri
  initializer.libraryScanner = await createLibraryScanner({ sdkPath: sdkDirectoryUri, server, type, fileUri })

  return initializer
}
