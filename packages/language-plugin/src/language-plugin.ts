import type { LanguagePlugin, VirtualCode } from '@volar/language-core'
import type { TypeScriptServiceScript } from '@volar/typescript'
import type * as ets from 'ohos-typescript'
import type * as ts from 'typescript'
import type { URI } from 'vscode-uri'
import path from 'node:path'
import { $$thisFixerPlugin } from './$$this-fixer-plugin'
import { ESObjectPlugin } from './es-object-plugin'
import { createEmptyVirtualCode, createVirtualCode, ETSVirtualCode } from './ets-code'

export interface ETSLanguagePluginOptions {
  /**
   * Paths excluded from virtual code. It is very useful when you want to disable files in the `openharmony` & `hms` sdk.
   */
  excludePaths?: string[]
  /**
   * The path to the `tsdk`.
   *
   * Declaration files located within the `tsdk`, such as type declarations in the `lib.dom.d.ts`, are
   * incompatible with the `openharmony` & `hms` sdk and can interfere with it. A series of diagnostics
   * should be specified for the `tsdk` path to eliminate incompatibility.
   */
  tsdk?: string
}

/**
 * This {@linkcode ETSLanguagePlugin} is used to create the virtual code for the ETS and TS files.
 *
 * It supports the typescript-plugin-side & language-server-side.
 *
 * @see Structure of the virtual code: https://github.com/ohosvscode/arkTS/issues/36#issuecomment-2977236063
 * @param tsOrEts If passed {@linkcode ets} means current mode is language-server-side, otherwise is typescript-plugin-side.
 * @param options - The options for the plugin. See: {@linkcode ETSLanguagePluginOptions}
 */
export function ETSLanguagePlugin(tsOrEts: typeof ts, options?: ETSLanguagePluginOptions): LanguagePlugin<URI | string>
export function ETSLanguagePlugin(tsOrEts: typeof ets, options?: ETSLanguagePluginOptions): LanguagePlugin<URI | string>
export function ETSLanguagePlugin(tsOrEts: typeof ets | typeof ts, { excludePaths = [], tsdk = '' }: ETSLanguagePluginOptions = {}): LanguagePlugin<URI | string> {
  const isETSServerMode = isEts(tsOrEts)

  function getLanguageId(uri: URI | string): string | undefined {
    const filePath = typeof uri === 'string' ? uri : uri.fsPath
    if (filePath.endsWith('.ets')) return 'ets'
    if (filePath.endsWith('.ts')) return 'typescript'
    if (filePath.endsWith('.json') || filePath.endsWith('.json5') || filePath.endsWith('.jsonc') || filePath.endsWith('.tsbuildinfo')) return 'json'
    return undefined
  }

  function getScriptKindByFilePath(filePath: string, defaultExtension: string = '.ets'): [ets.ScriptKind, string] {
    if (!filePath) return [7 satisfies typeof ets.ScriptKind.Deferred, defaultExtension]
    if (filePath.endsWith('.d.ts')) return [3 satisfies typeof ets.ScriptKind.TS, '.d.ts']
    if (filePath.endsWith('.d.ets')) return [8 satisfies typeof ets.ScriptKind.ETS, '.d.ets']
    if (filePath.endsWith('.d.cts')) return [3 satisfies typeof ets.ScriptKind.TS, '.d.cts']
    if (filePath.endsWith('.d.mts')) return [3 satisfies typeof ets.ScriptKind.TS, '.d.mts']

    const extension = path.extname(filePath)
    switch (extension) {
      case '.ts':
      case '.cts':
      case '.mts':
        return [3 satisfies typeof ets.ScriptKind.TS, extension]
      case '.ets':
        return [8 satisfies typeof ets.ScriptKind.ETS, extension]
      default:
        return [7 satisfies typeof ets.ScriptKind.Deferred, extension]
    }
  }

  if (isETSServerMode) {
    return {
      getLanguageId,
      createVirtualCode(uri, languageId, snapshot) {
        const filePath = path.resolve(typeof uri === 'string' ? uri : uri.fsPath)
        if (languageId === 'ets') {
          return new ETSVirtualCode(
            filePath,
            tsOrEts.createSourceFile(filePath, snapshot.getText(0, snapshot.getLength()), 99 as any) as unknown as ts.SourceFile,
            'typescript',
            [$$thisFixerPlugin(), ESObjectPlugin()] as any,
          )
        }
        // json5、json files, directly using full feature virtual code
        if (filePath.endsWith('.json') || filePath.endsWith('.json5') || filePath.endsWith('.jsonc') || languageId === 'json' || languageId === 'jsonc') return getFullVirtualCode(snapshot, languageId)
        // tsdk files we must disable the full feature virtual code but still keep the full content
        if (filePath.startsWith(tsdk)) return getDisabledVirtualCode(snapshot, languageId)
      },
      typescript: {
        extraFileExtensions: [
          // eslint-disable-next-line ts/ban-ts-comment
          // @ts-expect-error
          { extension: 'ets', isMixedContent: false, scriptKind: 8 satisfies ets.ScriptKind.ETS },
          // eslint-disable-next-line ts/ban-ts-comment
          // @ts-expect-error
          { extension: 'd.ets', isMixedContent: false, scriptKind: 8 satisfies ets.ScriptKind.ETS },
        ],
        resolveHiddenExtensions: true,
        getServiceScript(root: VirtualCode & { filePath: string }) {
          const [scriptKind, extension] = getScriptKindByFilePath(root.filePath)
          return {
            code: root,
            extension,
            scriptKind,
          } as unknown as TypeScriptServiceScript
        },
      },
    }
  }

  return {
    getLanguageId,
    createVirtualCode(uri, languageId, snapshot) {
      const filePath = path.resolve(typeof uri === 'string' ? uri : uri.fsPath)
      const isInExcludePath = excludePaths.some(excludePath => filePath.startsWith(excludePath))
      if ((filePath.endsWith('.d.ts') || filePath.endsWith('.d.ets')) && isInExcludePath) return getFullDisabledVirtualCode(snapshot, languageId, { filePath })
    },
    typescript: {
      extraFileExtensions: [],
      getServiceScript(root: VirtualCode & { filePath: string }) {
        const [scriptKind, extension] = getScriptKindByFilePath(root.filePath, '.ts')
        return {
          code: root,
          extension,
          scriptKind: scriptKind as ts.ScriptKind,
        }
      },
    },
  }
}

function isEts(tsOrEts: typeof ets | typeof ts): tsOrEts is typeof ets {
  return 'ETS' in tsOrEts.ScriptKind && tsOrEts.ScriptKind.ETS === 8
}

// full feature virtual code
function getFullVirtualCode(snapshot: ts.IScriptSnapshot, languageId: string): VirtualCode {
  return createVirtualCode(snapshot, languageId, {
    completion: true,
    format: true,
    navigation: true,
    semantic: true,
    structure: true,
    verification: true,
  })
}

// disabled virtual code, but still keep the full content
function getDisabledVirtualCode(snapshot: ts.IScriptSnapshot, languageId: string): VirtualCode {
  return createVirtualCode(snapshot, languageId, {
    completion: false,
    format: false,
    navigation: false,
    semantic: false,
    structure: false,
    verification: false,
  })
}

// disabled virtual code, and remove the full content to empty string
function getFullDisabledVirtualCode<T extends Record<string, any>>(snapshot: ts.IScriptSnapshot, languageId: string, options?: T): VirtualCode & T {
  return createEmptyVirtualCode(snapshot, languageId, {
    completion: false,
    format: false,
    navigation: false,
    semantic: false,
    structure: false,
    verification: false,
  }, options)
}
