import type { LanguageServerLogger } from '@arkts/shared'
import type { LanguageServicePlugin } from '@volar/language-server'
import { URI } from 'vscode-uri'
import type { CodeLinterConfigManager } from '../classes/code-linter-config'

interface TSProvider {
  'typescript/languageServiceHost': () => import('ohos-typescript').LanguageServiceHost
}

export function createETSLinterDiagnosticService(ets: typeof import('ohos-typescript'), logger: LanguageServerLogger, configManager?: CodeLinterConfigManager): LanguageServicePlugin {
  return {
    name: 'arkts-diagnostic',
    capabilities: {
      diagnosticProvider: {
        interFileDependencies: true,
        workspaceDiagnostics: true,
      },
    },
    create(context) {
      const languageServiceHost = context.inject<TSProvider>('typescript/languageServiceHost')
      if (!languageServiceHost)
        return {}

      const languageService = ets.createLanguageService(languageServiceHost)

      return {
        provideDiagnostics(document, token) {
          if (token.isCancellationRequested)
            return

          try {
            // 检查文件是否匹配配置
            const fileUri = context.decodeEmbeddedDocumentUri(URI.parse(document.uri))?.[0]?.fsPath ?? 'index.ets'
            if (configManager && !configManager.isFileMatched(fileUri)) {
              return [] // 文件不在配置范围内，跳过检查
            }

            // eslint-disable-next-line ts/ban-ts-comment
            // @ts-expect-error
            const builderProgram = languageService.getBuilderProgram(/** withLinterProgram */ true)
            const sourceFile = ets.createSourceFile(fileUri, document.getText(), ets.ScriptTarget.Latest, true)
            
            // 获取用户配置的规则
            const userConfig = configManager?.getConfig()
            const ruleSet = userConfig?.ruleSet || []
            const rules = userConfig?.rules || {}
            
            // 基础诊断结果
            let diagnostics: any[] = []
            
            // 默认运行 ArkTS Linter（如果没有禁用）
            if (!rules['arkts-linter'] || rules['arkts-linter'] !== 'off') {
              diagnostics.push(
                ...ets.ArkTSLinter_1_0.runArkTSLinter(builderProgram!, sourceFile, undefined, 'ArkTS_1_0'),
                ...ets.ArkTSLinter_1_1.runArkTSLinter(builderProgram!, sourceFile, undefined, 'ArkTS_1_1'),
              )
            }
            
            // 根据用户配置过滤或修改诊断级别
            if (Object.keys(rules).length > 0) {
              diagnostics = diagnostics.map((diagnostic: any) => {
                const ruleName = diagnostic.source || diagnostic.code
                const ruleConfig = rules[ruleName]
                
                if (ruleConfig === 'off' || ruleConfig === 0) {
                  return null // 禁用该规则
                }
                
                // 调整诊断级别
                if (ruleConfig === 'error' || ruleConfig === 2) {
                  diagnostic.severity = 1 // Error
                } else if (ruleConfig === 'warn' || ruleConfig === 1) {
                  diagnostic.severity = 2 // Warning
                } else if (ruleConfig === 'suggestion' || ruleConfig === 3) {
                  diagnostic.severity = 3 // Information
                }
                
                return diagnostic
              }).filter(Boolean)
            }
            
            logger.getConsola().debug(`ArkTS 诊断结果: ${diagnostics.length} 条诊断信息`)
            return diagnostics
          }
          catch (error) {
            logger.getConsola().error(`ArkTS Linter error: `)
            console.error(error)
            return []
          }
        },
      }
    },
  }
}
