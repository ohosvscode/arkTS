import type { LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-server'
import type * as ArkTS from 'ohos-typescript'
import type { ArkTSInitializationOptions } from '../initialize-options'
import { URI, Utils } from 'vscode-uri'
import { patchIsDefaultLibrary } from './patch-default-library'
import { patchHoverProvider } from './patch-hover'

interface TSProvider {
  'typescript/languageService'(): ArkTS.LanguageService
}

export function patchSemantic(sematicService: LanguageServicePlugin, options?: ArkTSInitializationOptions, fileUri?: string): void {
  const originalCreate = sematicService.create

  sematicService.create = (context) => {
    const originalInstance: LanguageServicePluginInstance = originalCreate(context)

    return {
      ...originalInstance,
      provideDocumentSemanticTokens(...args) {
        const languageService = context.inject<TSProvider>(`typescript/languageService`)
        if (!languageService) return originalInstance.provideDocumentSemanticTokens?.(...args)
        patchIsDefaultLibrary(languageService, [
          options?.ets.sdkPath,
          fileUri ? Utils.joinPath(URI.parse(fileUri), '..', 'lib').toString() : undefined,
        ].filter(Boolean) as string[])
        return originalInstance.provideDocumentSemanticTokens?.(...args)
      },

      async provideHover(document, position, token) {
        const originalHover = await originalInstance.provideHover?.(document, position, token) ?? undefined
        if (!originalHover) return null
        return patchHoverProvider(originalHover)
      },
    }
  }
}
