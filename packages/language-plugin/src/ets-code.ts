import type { CodeInformation, VirtualCode } from '@volar/language-core'
import type { TsmLanguagePlugin } from 'ts-macro'
import type * as ts from 'typescript'
import { TsmVirtualCode } from 'ts-macro'

export function createVirtualCode(snapshot: ts.IScriptSnapshot, languageId: string, data: CodeInformation): VirtualCode {
  return {
    id: 'root',
    languageId,
    snapshot,
    mappings: [{
      sourceOffsets: [0],
      generatedOffsets: [0],
      lengths: [snapshot.getLength()],
      data,
    }],
  }
}

export function createEmptyVirtualCode<T extends Record<string, any>>(snapshot: ts.IScriptSnapshot, languageId: string, data: CodeInformation, options?: T): VirtualCode & T {
  return {
    id: 'root',
    languageId,
    snapshot: {
      getText: () => '',
      getLength: () => 0,
      getChangeRange: () => undefined,
    },
    mappings: [{
      sourceOffsets: [0],
      generatedOffsets: [0],
      lengths: [snapshot.getLength()],
      data,
    }],
    ...options,
  } as unknown as VirtualCode & T
}

export class ETSVirtualCode extends TsmVirtualCode {
  readonly filePath: string

  constructor(filePath: string, sourceFile: ts.SourceFile, languageId: string, plugins: TsmLanguagePlugin[]) {
    super(filePath, sourceFile, languageId, plugins)
    this.filePath = filePath
  }
}

export type ETSMacroPlugin = Omit<TsmLanguagePlugin, 'resolveVirtualCode'> & {
  resolveVirtualCode?(virtualCode: ETSVirtualCode): void
}
