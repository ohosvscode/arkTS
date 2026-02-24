import type { EtsServerClientOptions } from './client-options'

type GetAPI = (version: 0) => {
  configurePlugin<PluginName extends keyof PluginOptions>(
    pluginName: PluginName,
    options: PluginOptions[PluginName],
  ): void
}

export interface TypescriptLanguageFeatures {
  getAPI?: GetAPI
}

export interface ETSPluginOptions {
  lspOptions: EtsServerClientOptions
}

export interface PluginOptions {
  'ets-typescript-plugin': ETSPluginOptions
}
