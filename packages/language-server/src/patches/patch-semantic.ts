import type { Hover, LanguageServicePlugin, TextDocument } from '@volar/language-server'
import { Range } from '@volar/language-server'
import * as ets from 'ohos-typescript'
import { convertClassificationsToSemanticTokens } from 'volar-service-typescript/lib/semanticFeatures/semanticTokens'
import { ContextUtil } from '../utils/finder'
import { convertSpansToClassifications } from '../utils/span-to-classification'

function getMarkdownJSDoc(node: ets.HasJSDoc): string[] {
  const markdownJsdocs: string[] = []
  const jsDocComment = ((node as any).jsDoc ?? []) as ets.JSDoc[]
  for (const jsDoc of jsDocComment) {
    markdownJsdocs.push(ets.getTextOfJSDocComment(jsDoc.comment) ?? '')
  }
  return markdownJsdocs
}

/**
 * 补丁：为`@interface`声明的注解提供正确的悬浮提示，以及正确的语义高亮。
 * 语义高亮将其由原本的类似class声明的高亮转为ts装饰器一样的高亮。
 */
export function patchSemantic(typescriptServices: LanguageServicePlugin[]): void {
  const originalCreate = typescriptServices[0].create
  typescriptServices[0].create = (context) => {
    const instance = originalCreate(context)
    const contextUtil = new ContextUtil(context)

    function findAnnotationDeclarationInPosition(currentPositionOffset: number, sourceFile: ets.SourceFile): ets.AnnotationDeclaration | undefined {
      let foundAnnotationDeclaration: ets.AnnotationDeclaration | undefined
      sourceFile.forEachChild(function walk(node): void {
        if (!ets.isAnnotationDeclaration(node)) return node.forEachChild(walk)
        if (currentPositionOffset >= node.getStart(sourceFile) && currentPositionOffset <= node.getEnd()) {
          foundAnnotationDeclaration = node
          return
        }
        return node.forEachChild(walk)
      })
      return foundAnnotationDeclaration
    }

    function provideAnnotationDeclarationHover(document: TextDocument, currentPositionOffset: number): Hover | undefined {
      const languageService = contextUtil.getLanguageService()
      if (!languageService) return
      const sourceFile = contextUtil.decodeSourceFile(document)
      if (!sourceFile) return
      const annotationDeclaration = findAnnotationDeclarationInPosition(currentPositionOffset, sourceFile)
      if (!annotationDeclaration) return
      const nameStart = annotationDeclaration.name.getStart(sourceFile)
      const nameEnd = annotationDeclaration.name.getEnd()
      if (currentPositionOffset >= nameStart && currentPositionOffset <= nameEnd) {
        return {
          contents: [
            {
              language: 'ets',
              value: `@interface ${annotationDeclaration.name.getText(sourceFile).replace(/^["'`]|["'`]$/g, '')}`,
            },
            '注意：@interface声明的注解仅在API20及以上版本可用。详见: https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts#用户自定义注解',
            'Note: @interface declarations are only available in API20 and above. See: https://developer.huawei.com/consumer/en/doc/harmonyos-guides/introduction-to-arkts#custom-annotation',
            ...getMarkdownJSDoc(annotationDeclaration),
          ],
          range: {
            start: document.positionAt(nameStart),
            end: document.positionAt(nameEnd),
          },
        }
      }
    }

    function findDecoratorInPosition(currentPositionOffset: number, sourceFile: ets.SourceFile): ets.Decorator | undefined {
      let foundDecorator: ets.Decorator | undefined
      sourceFile.forEachChild(function walk(node): void {
        if (!ets.isAnnotation(node)) return node.forEachChild(walk)
        if (currentPositionOffset >= node.getStart(sourceFile) && currentPositionOffset <= node.getEnd()) {
          foundDecorator = node
          return
        }
        return node.forEachChild(walk)
      })
      return foundDecorator
    }

    function provideAnnotationDecoratorHover(document: TextDocument, currentPositionOffset: number): Hover | undefined {
      const languageService = contextUtil.getLanguageService()
      if (!languageService) return
      const sourceFile = contextUtil.decodeSourceFile(document)
      if (!sourceFile) return
      const decorator = findDecoratorInPosition(currentPositionOffset, sourceFile)
      if (!decorator) return
      if (!decorator.annotationDeclaration) return
      if (currentPositionOffset >= decorator.expression.getStart(sourceFile) && currentPositionOffset <= decorator.expression.getEnd()) {
        const annotationText = decorator.expression.getText(sourceFile).replace(/^["'`]|["'`]$/g, '')
        const markdownJsdocs = getMarkdownJSDoc(decorator.annotationDeclaration)
        return {
          contents: [
            `\`\`\`ets\n@interface ${annotationText}\n\`\`\`\n\n${markdownJsdocs.join('\n---\n')}`,
          ],
          range: Range.create(
            document.positionAt(decorator.expression.getStart(sourceFile)),
            document.positionAt(decorator.expression.getEnd()),
          ),
        }
      }
    }

    return {
      ...instance,
      provideDocumentSemanticTokens: async (document, range, legend) => {
        const languageService = contextUtil.getLanguageService()
        if (!languageService) return []
        const sourceFile = contextUtil.decodeSourceFile(document)
        if (!sourceFile) return []
        const span = { start: document.offsetAt(range.start), length: document.offsetAt(range.end) - document.offsetAt(range.start) }
        const classifications = languageService.getSemanticClassifications(
          sourceFile.fileName,
          span,
          ets.SemanticClassificationFormat.TwentyTwenty,
        )
        for (const classification of classifications) {
          // @interface默认是256，我们将其改为2824，即ts装饰器的高亮类型
          if (classification.classificationType === 256) {
            classification.classificationType = 2824
          }
        }
        return convertClassificationsToSemanticTokens(document, span, legend, convertSpansToClassifications(classifications))
      },

      async provideHover(document, position, token) {
        // 补丁：关闭 json 文件的悬浮提示功能
        if (document.languageId === 'json' || document.languageId === 'jsonc') return null
        // Hover补丁：提供注解装饰器的悬浮提示 （Decorator For Annotation）
        const annotationDecoratorHover = provideAnnotationDecoratorHover(document, document.offsetAt(position))
        if (annotationDecoratorHover) return annotationDecoratorHover
        // Hover补丁：提供注解装饰器声明的悬浮提示 （AnnotationDeclaration）
        const annotationDeclarationHover = provideAnnotationDeclarationHover(document, document.offsetAt(position))
        if (annotationDeclarationHover) return annotationDeclarationHover
        const originalHover = await instance.provideHover?.(document, position, token) ?? undefined
        if (!originalHover) return null
        if (Array.isArray(originalHover.contents)) return originalHover
        if (typeof originalHover.contents !== 'object') return originalHover
        if (!('kind' in originalHover.contents)) return originalHover
        originalHover.contents.value = originalHover.contents.value.replace(/```typescript/, '```ets')
        return originalHover
      },

      async provideDefinition(document, position, token) {
        // 补丁：关闭 json 文件的跳转定义功能
        if (document.languageId === 'json' || document.languageId === 'jsonc') return null
        return instance.provideDefinition?.(document, position, token)
      },
    }
  }
}
