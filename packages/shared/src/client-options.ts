export interface VolarClientOptions {
  /** The currently tsdk path. */
  tsdk: string
}

export interface OhosClientOptions {
  /** The currently ohos sdk path. If not exists the lsp will not work. */
  sdkPath: string | undefined
  /** The currently hms sdk path. */
  hmsSdkPath: string | undefined
  /** The `ets/component` folder of the SDK. If not exists the lsp will not work. */
  etsComponentPath: string | undefined
  /** The `ets/build-tools/ets-loader/tsconfig.json` path. If not exists the lsp will not work. */
  etsLoaderConfigPath: string | undefined
  /** The `ets/build-tools/ets-loader` path. If not exists the lsp will not work. */
  etsLoaderPath: string | undefined
  /** The libs of the SDK, and typescript compiler options. */
  lib: string[]
  /** typeRoots for the typescript compiler. */
  typeRoots: string[]
  /** The base url for the typescript compiler. */
  baseUrl: string
  /** The paths for the typescript compiler, will be original pass to typescript. */
  paths: import('ohos-typescript').MapLike<string[]>
  /** The paths for the typescript compiler, will be converted to relative paths with detected tsconfig file. */
  relativeWithConfigFilePaths?: import('ohos-typescript').MapLike<string[]>
}

export interface EtsServerClientOptions {
  /** Volar client options. */
  typescript: VolarClientOptions
  /** ETS server options. */
  ohos: OhosClientOptions
  /** Debug mode. */
  debug?: boolean
  /** ETS specific options. */
  ets?: {
    /** Resource reference diagnostic level. */
    resourceReferenceDiagnostic?: 'error' | 'warning' | 'none'
    /** Rawfile reference diagnostic level. */
    rawfileReferenceDiagnostic?: 'error' | 'warning' | 'none'
  }
}
