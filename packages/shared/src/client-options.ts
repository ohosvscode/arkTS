export interface EtsServerClientOptions {
  /** Debug mode. */
  debug?: boolean
  /** ETS specific options. */
  ets?: {
    /** The currently ohos sdk path. If not exists the lsp will not work. */
    sdkPath: string | undefined
  }
}
