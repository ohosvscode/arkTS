import type { LanguageServerConfigurator } from '@arkts/shared'
import type { Diagnostic, LanguageServicePlugin } from '@volar/language-server'
import { DiagnosticSeverity, Range } from '@volar/language-server'
import { ContextUtil } from '../utils/context-util'

export function createArkTSLinter(ets: typeof import('ohos-typescript'), config: LanguageServerConfigurator): LanguageServicePlugin {
  return {
    name: 'arkts-linter',
    capabilities: {
      diagnosticProvider: {
        interFileDependencies: true,
        workspaceDiagnostics: true,
      },
    },
    create(context) {
      const contextUtil = new ContextUtil(context)

      function convertDiagnosticCategoryToSeverity(category: import('ohos-typescript').DiagnosticCategory): DiagnosticSeverity {
        switch (category) {
          case ets.DiagnosticCategory.Error:
            return DiagnosticSeverity.Error
          case ets.DiagnosticCategory.Warning:
            return DiagnosticSeverity.Warning
          case ets.DiagnosticCategory.Suggestion:
            return DiagnosticSeverity.Hint
          default:
            return DiagnosticSeverity.Information
        }
      }

      return {
        dispose: () => contextUtil.dispose(),
        provideDiagnostics(document) {
          if (!document.getText().trim()) return []
          const sdkPath = config.getSdkPath()
          const documentUri = contextUtil.decodeTextDocumentUri(document)
          if (!documentUri || documentUri.fsPath.endsWith('.d.ets')) return []
          if (sdkPath && (!documentUri || documentUri.fsPath.startsWith(sdkPath))) return []
          const languageService = contextUtil.getStandaloneLanguageService(ets)
          if (!documentUri || !languageService) return []

          // getBuilderProgram() 在 ArkTS 中其实是支持一个参数: withLinterProgram, 用于指定是否
          // 创建包含 linter 程序的 BuilderProgram （即，使用 ets.createIncrementalProgramForArkTs() 函数
          // 来创建 builder Program）, 默认为不包含 linter 程序，因此需要强行传递一个 true 参数，确保拿到的
          // BuilderProgram 是包含 linter 程序的。
          // eslint-disable-next-line ts/ban-ts-comment
          // @ts-expect-error
          const incrementalProgram = languageService.getBuilderProgram(true)
          if (!incrementalProgram) {
            console.warn('Failed to get incremental program, cannot run arkts linter.')
            return []
          }
          const arktsLinterDiagnostics = ets.ArkTSLinter_1_1.runArkTSLinter(incrementalProgram)
          const diagnostics: Diagnostic[] = []

          for (const diagnostic of arktsLinterDiagnostics) {
            if (!diagnostic.file) continue
            if (typeof diagnostic.start !== 'number' || typeof diagnostic.length !== 'number') continue
            if (diagnostic.file.fileName !== documentUri.fsPath) continue

            diagnostics.push({
              range: Range.create(
                document.positionAt(diagnostic.start),
                document.positionAt(diagnostic.start + diagnostic.length),
              ),
              message: typeof diagnostic.messageText === 'string' ? diagnostic.messageText : diagnostic.messageText.messageText,
              severity: convertDiagnosticCategoryToSeverity(diagnostic.category),
              source: diagnostic.source ?? 'arkts-linter',
              code: diagnostic.code,
            })
          }

          return diagnostics
        },
      }
    },
  }
}
