import type * as ArkTS from 'ohos-typescript'
import { URI } from 'vscode-uri'
import { isContainsInUri } from '../utils/uri'

export function patchIsDefaultLibrary(languageService: ArkTS.LanguageService, libraryPaths: string[]): void {
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-expect-error
  if (languageService.getProgram.patched === true) return
  const originalGetProgram = languageService.getProgram.bind(languageService)
  languageService.getProgram = () => {
    const program = originalGetProgram()
    if (!program) return program
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-expect-error
    if (program.isSourceFileDefaultLibrary.patched === true) return program
    const originalIsSourceFileDefaultLibrary = program.isSourceFileDefaultLibrary.bind(program)
    const patchedIsSourceFileDefaultLibrary = (sourceFile: ArkTS.SourceFile): boolean => {
      for (const libraryPath of libraryPaths) {
        if (isContainsInUri(sourceFile.fileName, libraryPath, URI)) return true
      }
      return originalIsSourceFileDefaultLibrary(sourceFile)
    }
    patchedIsSourceFileDefaultLibrary.patched = true
    program.isSourceFileDefaultLibrary = patchedIsSourceFileDefaultLibrary
    return program
  }
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-expect-error
  languageService.getProgram.patched = true
}
