import type { LanguagePlugin } from '@volar/language-server'

export function ArkTSLanguagePlugin(): LanguagePlugin {
  return {
    getLanguageId: () => 'arkts',
    createVirtualCode: (_, languageId, snapshot) => ({
      id: 'root',
      languageId,
      snapshot,
      mappings: [{
        sourceOffsets: [0],
        generatedOffsets: [0],
        lengths: [snapshot.getLength()],
        data: {
          completion: true,
          format: true,
          navigation: true,
          semantic: true,
          structure: true,
          verification: true,
        },
      }],
    }),
    typescript: {
      extraFileExtensions: [],
      getServiceScript: (code) => {
        return {
          code,
          extension: '.ets',
          scriptKind: 8 as import('typescript').ScriptKind,
        }
      },
    },
  }
}
