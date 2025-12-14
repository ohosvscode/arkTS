import type * as ts from 'typescript'
import process from 'node:process'
import { ETSLanguagePlugin } from '@arkts/language-plugin'
import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'

/**
 * 尝试解析环境变量 `__etsTypescriptPluginFeature`是否为JSON，如果解析失败则返回一个空对象。
 *
 * 这适用于在插件加载时获取配置或其他相关信息。
 */
function tryParseEnv(): Record<string, any> {
  try {
    return JSON.parse(process.env.__etsTypescriptPluginFeature || '{}')
  }
  catch (error) {
    console.error('Failed to parse __etsTypescriptPluginFeature:', error)
    return {}
  }
}

interface ConfigFileDiagMessage extends ts.server.protocol.Message {
  type: 'event'
  event: 'configFileDiag'
  body: {
    diagnostics: {
      code: 5023
      text: string
      fileName: string
      category: 'error'
    }[]
  }
}

function isConfigFileDiagMessage(msg: ts.server.protocol.Message): msg is ConfigFileDiagMessage {
  return msg.type === 'event'
    && 'event' in msg
    && msg.event === 'configFileDiag'
    && 'body' in msg
    && typeof msg.body === 'object'
    && msg.body !== null
    && 'diagnostics' in msg.body
    && Array.isArray(msg.body.diagnostics)
    && msg.body.diagnostics.every((diagnostic) => {
      return typeof diagnostic === 'object'
        && diagnostic !== null
        && 'code' in diagnostic
        && diagnostic.code === 5023
        && 'text' in diagnostic
        && typeof diagnostic.text === 'string'
        && 'fileName' in diagnostic
        && typeof diagnostic.fileName === 'string'
        && 'category' in diagnostic
        && diagnostic.category === 'error'
    })
}

/**
 * ### 这个插件做了什么？
 *
 * 将传输过来的ohos SDK路径与当前打开的文件位置进行比对，
 * 如果当前打开的文件位置在ohos SDK路径下，则覆写compilerOptions
 * 让TS服务器将其作为一个`lib`来处理。
 *
 * ---
 *
 * ### 如何查看log？
 *
 * 点开一个`.ts`文件然后按 Ctrl + shift + P 输入`Typescript: Open TS Server Log`
 */
const plugin: ts.server.PluginModuleFactory = createLanguageServicePlugin((ts, info) => {
  const env = tryParseEnv()
  if (env?.lspOptions?.ohos?.sdkPath) info.config = env
  const sdkPath = info.config?.lspOptions?.ohos?.sdkPath
  const hmsSdkPath = info.config?.lspOptions?.ohos?.hmsSdkPath

  console.warn(`ETS typescript plugin loaded! sdkPath: ${sdkPath}, hmsSdkPath: ${hmsSdkPath}`)
  console.warn(`Current config: ${JSON.stringify(info.config)}`)

  const originalGetCompilerOptionsDiagnostics = info.languageService.getCompilerOptionsDiagnostics.bind(info.languageService)
  info.languageService.getCompilerOptionsDiagnostics = () => {
    const env = tryParseEnv()
    // 过滤掉因为SDK路径不存在而产生的警告（位于 tsconfig.json 中）
    const diagnostics = originalGetCompilerOptionsDiagnostics()
    return diagnostics.filter((diagnostic) => {
      // 过滤掉 `importsNotUsedAsValues"已删除。请从配置中删除它` 在 OpenHarmony SDK 中的警告
      if (diagnostic.code === 5102 && diagnostic.file?.fileName.startsWith(env?.lspOptions?.ohos?.sdkPath ?? '')) return false
      // 非字符串文本，不处理；非5055代码，不处理
      if (typeof diagnostic.messageText !== 'string' || diagnostic.code !== 5055) return true
      // 没有SDK路径，不处理
      if (!env?.lspOptions?.ohos?.sdkPath) return true
      // 如果SDK路径存在，则检查是否包含SDK路径, 不包含则保留, 包含则过滤掉
      return !diagnostic.messageText.includes(env.lspOptions.ohos.sdkPath)
    })
  }

  if (info.session) {
    const originalSend = info.session.send.bind(info.session)
    info.session.send = (msg) => {
      if (!isConfigFileDiagMessage(msg)) return originalSend(msg)
      if (!msg.body.diagnostics.some(value => value.text.includes('ets'))) return originalSend(msg)
    }
  }

  // 如果没有传递这个配置，则不启用插件
  if (!info.config?.lspOptions?.ohos) {
    return { languagePlugins: [] }
  }

  return {
    languagePlugins: [
      ETSLanguagePlugin(ts, {
        excludePaths: [sdkPath, hmsSdkPath].filter(Boolean) as string[],
        tsdk: info.config?.lspOptions?.typescript?.tsdk,
      }),
    ],
  }
})

// eslint-disable-next-line no-restricted-syntax
export = plugin
