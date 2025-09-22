import type { LanguageServicePlugin } from '@volar/language-service'
import type * as ets from 'ohos-typescript'
import { Range } from '@volar/language-server/node'
import { ContextUtil } from '../utils/finder'
import type { CodeLinterConfigManager } from '../classes/code-linter-config'

export function createETSFormattingService(configManager?: CodeLinterConfigManager): LanguageServicePlugin {
  return {
    name: 'arkts-formatting',
    capabilities: {
      documentFormattingProvider: true,
    },
    create(context) {
      return {
        provideDocumentFormattingEdits(document, _range) {
          const ctx = new ContextUtil(context)
          const languageService = ctx.getLanguageService()
          const sourceFile = ctx.decodeSourceFile(document)
          if (!languageService || !sourceFile)
            return []

          // 获取格式化配置
          const userFormattingConfig = configManager?.getFormattingConfig()
          
          // 默认格式化选项
          const defaultOptions: ets.FormatCodeSettings = {
            baseIndentSize: 0,
            indentSize: 2,
            tabSize: 2,
            newLineCharacter: ';',
            convertTabsToSpaces: true,
            indentStyle: 2 as ets.IndentStyle.Smart,
            trimTrailingWhitespace: true,
            insertSpaceAfterCommaDelimiter: true,
            insertSpaceAfterSemicolonInForStatements: true,
            insertSpaceBeforeAndAfterBinaryOperators: true,
            insertSpaceAfterConstructor: false,
            insertSpaceAfterKeywordsInControlFlowStatements: true,
            insertSpaceAfterFunctionKeywordForAnonymousFunctions: false,
            insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
            insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
            insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false,
            insertSpaceAfterOpeningAndBeforeClosingEmptyBraces: false,
            insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: true,
            insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: true,
            insertSpaceAfterTypeAssertion: false,
            insertSpaceBeforeFunctionParenthesis: false,
            placeOpenBraceOnNewLineForFunctions: false,
            placeOpenBraceOnNewLineForControlBlocks: false,
            insertSpaceBeforeTypeAnnotation: true,
            indentMultiLineObjectLiteralBeginningOnBlankLine: false,
            semicolons: 'ignore' as ets.SemicolonPreference.Ignore,
          }

          // 合并用户配置
          const formatOptions = userFormattingConfig ? {
            ...defaultOptions,
            baseIndentSize: userFormattingConfig.baseIndentSize ?? defaultOptions.baseIndentSize,
            indentSize: userFormattingConfig.indentSize ?? defaultOptions.indentSize,
            tabSize: userFormattingConfig.tabSize ?? defaultOptions.tabSize,
            convertTabsToSpaces: userFormattingConfig.convertTabsToSpaces ?? defaultOptions.convertTabsToSpaces,
            indentStyle: (userFormattingConfig.indentStyle === 'Smart' ? 2 : userFormattingConfig.indentStyle === 'Block' ? 1 : 0) as ets.IndentStyle,
            trimTrailingWhitespace: userFormattingConfig.trimTrailingWhitespace ?? defaultOptions.trimTrailingWhitespace,
            insertSpaceAfterCommaDelimiter: userFormattingConfig.insertSpaceAfterCommaDelimiter ?? defaultOptions.insertSpaceAfterCommaDelimiter,
            insertSpaceAfterSemicolonInForStatements: userFormattingConfig.insertSpaceAfterSemicolonInForStatements ?? defaultOptions.insertSpaceAfterSemicolonInForStatements,
            insertSpaceBeforeAndAfterBinaryOperators: userFormattingConfig.insertSpaceBeforeAndAfterBinaryOperators ?? defaultOptions.insertSpaceBeforeAndAfterBinaryOperators,
            insertSpaceAfterConstructor: userFormattingConfig.insertSpaceAfterConstructor ?? defaultOptions.insertSpaceAfterConstructor,
            insertSpaceAfterKeywordsInControlFlowStatements: userFormattingConfig.insertSpaceAfterKeywordsInControlFlowStatements ?? defaultOptions.insertSpaceAfterKeywordsInControlFlowStatements,
            insertSpaceAfterFunctionKeywordForAnonymousFunctions: userFormattingConfig.insertSpaceAfterFunctionKeywordForAnonymousFunctions ?? defaultOptions.insertSpaceAfterFunctionKeywordForAnonymousFunctions,
            insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: userFormattingConfig.insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis ?? defaultOptions.insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis,
            insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: userFormattingConfig.insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets ?? defaultOptions.insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets,
            insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: userFormattingConfig.insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces ?? defaultOptions.insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces,
            insertSpaceAfterOpeningAndBeforeClosingEmptyBraces: userFormattingConfig.insertSpaceAfterOpeningAndBeforeClosingEmptyBraces ?? defaultOptions.insertSpaceAfterOpeningAndBeforeClosingEmptyBraces,
            insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: userFormattingConfig.insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces ?? defaultOptions.insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces,
            insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: userFormattingConfig.insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces ?? defaultOptions.insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces,
            insertSpaceAfterTypeAssertion: userFormattingConfig.insertSpaceAfterTypeAssertion ?? defaultOptions.insertSpaceAfterTypeAssertion,
            insertSpaceBeforeFunctionParenthesis: userFormattingConfig.insertSpaceBeforeFunctionParenthesis ?? defaultOptions.insertSpaceBeforeFunctionParenthesis,
            placeOpenBraceOnNewLineForFunctions: userFormattingConfig.placeOpenBraceOnNewLineForFunctions ?? defaultOptions.placeOpenBraceOnNewLineForFunctions,
            placeOpenBraceOnNewLineForControlBlocks: userFormattingConfig.placeOpenBraceOnNewLineForControlBlocks ?? defaultOptions.placeOpenBraceOnNewLineForControlBlocks,
            insertSpaceBeforeTypeAnnotation: userFormattingConfig.insertSpaceBeforeTypeAnnotation ?? defaultOptions.insertSpaceBeforeTypeAnnotation,
            indentMultiLineObjectLiteralBeginningOnBlankLine: userFormattingConfig.indentMultiLineObjectLiteralBeginningOnBlankLine ?? defaultOptions.indentMultiLineObjectLiteralBeginningOnBlankLine,
            semicolons: (userFormattingConfig.semicolons === 'insert' ? 'insert' : userFormattingConfig.semicolons === 'remove' ? 'remove' : 'ignore') as ets.SemicolonPreference,
          } : defaultOptions

          const textChanges = languageService.getFormattingEditsForDocument(sourceFile.fileName, formatOptions)

          return textChanges.map(change => ({
            range: Range.create(
              document.positionAt(change.span.start),
              document.positionAt(change.span.start + change.span.length),
            ),
            newText: change.newText,
          }))
        },
      }
    },
  }
}
