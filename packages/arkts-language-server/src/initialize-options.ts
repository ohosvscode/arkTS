export interface ArkTSInitializationOptions {
  /**
   * ETS initialization options.
   */
  readonly ets: ArkTSInitializationOptions.ETS
}

export namespace ArkTSInitializationOptions {
  /**
   * ETS initialization options.
   */
  export interface ETS {
    /**
     * The path to the OpenHarmony SDK.
     */
    readonly sdkPath: string
  }
}
