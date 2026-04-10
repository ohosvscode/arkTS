import type { LanguageServerConfigurator } from '@arkts/shared'
import type { CompletionContext, CompletionItem, CompletionList, Diagnostic, DocumentLink, FileStat, Hover, LanguageServicePluginInstance, LocationLink, NullableProviderResult, TextDocument } from '@volar/language-server'
import type * as ets from 'ohos-typescript'
import type { Product, ProjectDetectorManager } from '../interfaces'
import type { ContextUtil } from '../utils/context-util'
import type { LocaleStorage } from '../utils/i18n'
import type { GlobalCallExpressionFinder } from './global-call-finder'
import { CompletionItemKind, DiagnosticSeverity, FileType, MarkupKind, Position, Range } from '@volar/language-server'
import { Uri } from '@vstils/core'
import { permissions } from '../auth/permission'
import { MediaReference } from '../interfaces/media-reference'
import { Reference } from '../interfaces/reference'
import { SysResource } from '../interfaces/sys-resource'
import { simpleTranslate } from '../utils/i18n'
import { LEADING_TRAILING_QUOTE_REGEX } from '../utils/regex'
import { UriUtil } from '../utils/uri-util'

export interface ResourceProvider {
  getDefinitionProvider(): ResourceProvider.DefinitionProvider
  getCompletionProvider(): ResourceProvider.CompletionProvider
  getDiagnosticProvider(): ResourceProvider.DiagnosticProvider
  getDocumentLinkProvider(): ResourceProvider.DocumentLinkProvider
  getHoverProvider(): ResourceProvider.HoverProvider
}

export namespace ResourceProvider {
  export interface DefinitionProvider extends Required<Pick<LanguageServicePluginInstance, 'provideDefinition'>> {}

  export interface CompletionProvider extends Required<Pick<LanguageServicePluginInstance, 'provideCompletionItems'>> {}

  export interface DiagnosticProvider extends Required<Pick<LanguageServicePluginInstance, 'provideDiagnostics'>> {}

  export interface DocumentLinkProvider extends Required<Pick<LanguageServicePluginInstance, 'provideDocumentLinks'>> {}

  export interface HoverProvider extends Required<Pick<LanguageServicePluginInstance, 'provideHover'>> {}
}

export namespace ResourceProvider {
  const emptyRange = Range.create(
    Position.create(0, 0),
    Position.create(0, 0),
  )

  const imageHoverText = {
    properties: {
      default: 'Properties',
      zh: '属性',
    } satisfies LocaleStorage,
    value: {
      default: 'Value',
      zh: '值',
    } satisfies LocaleStorage,
    qualifiers: {
      default: 'Resource qualifiers',
      zh: '资源组限定词',
    } satisfies LocaleStorage,
    fileName: {
      default: 'File Name',
      zh: '文件名',
    } satisfies LocaleStorage,
    fileSize: {
      default: 'File Size',
      zh: '文件大小',
    } satisfies LocaleStorage,
  } as const

  export function create(
    context: ContextUtil,
    globalCallExpressionFinder: GlobalCallExpressionFinder,
    projectDetectorManager: ProjectDetectorManager,
    config: LanguageServerConfigurator,
    ets: typeof import('ohos-typescript'),
    languageServices: Set<ets.LanguageService>,
  ): ResourceProvider {
    const definitionProvider = new DefinitionProviderImpl(
      context,
      globalCallExpressionFinder,
      projectDetectorManager,
      config,
      ets,
      languageServices,
    )
    const completionProvider = new CompletionProviderImpl(
      context,
      globalCallExpressionFinder,
      projectDetectorManager,
      config,
      ets,
      languageServices,
    )
    const diagnosticProvider = new DiagnosticProviderImpl(
      context,
      globalCallExpressionFinder,
      projectDetectorManager,
      config,
      ets,
      languageServices,
    )
    const documentLinkProvider = new DocumentLinkProviderImpl(
      context,
      globalCallExpressionFinder,
      projectDetectorManager,
      config,
      ets,
      languageServices,
    )
    const hoverProvider = new HoverProviderImpl(
      context,
      globalCallExpressionFinder,
      projectDetectorManager,
      config,
      ets,
      languageServices,
    )

    return {
      getDefinitionProvider: () => definitionProvider,
      getCompletionProvider: () => completionProvider,
      getDiagnosticProvider: () => diagnosticProvider,
      getDocumentLinkProvider: () => documentLinkProvider,
      getHoverProvider: () => hoverProvider,
    }
  }

  abstract class ResourceProviderImpl {
    constructor(
      protected readonly contextUtil: ContextUtil,
      protected readonly globalCallExpressionFinder: GlobalCallExpressionFinder,
      protected readonly projectDetectorManager: ProjectDetectorManager,
      protected readonly config: LanguageServerConfigurator,
      protected readonly ets: typeof import('ohos-typescript'),
      protected readonly languageServices: Set<ets.LanguageService>,
    ) {}

    findProductByUri(uri: string | Uri): Product | undefined {
      return this.projectDetectorManager.findByUri(uri.toString())
        ?.findByUri(uri.toString())
        ?.findByUri(uri.toString())
        ?.findByUri(uri.toString())
    }

    getReadonlySourceFiles(): readonly ets.SourceFile[] {
      return Array.from(this.languageServices).flatMap(languageService => languageService.getProgram()?.getSourceFiles() ?? [])
    }

    findStringLiterals<SF extends ets.SourceFile>(sourceFile: SF, escapeText?: string): readonly ets.StringLiteral[] {
      const stringLiterals: ets.StringLiteral[] = []
      const walk = (node: ets.Node): void | number => {
        if (!this.ets.isStringLiteral(node)) return node.forEachChild(walk)
        if (escapeText && node.getText(sourceFile).replace(LEADING_TRAILING_QUOTE_REGEX, '') !== escapeText) return
        stringLiterals.push(node)
      }
      sourceFile.forEachChild(walk)
      return stringLiterals
    }

    getRequestPermissionsStringLiterals(sourceFile: ets.SourceFile): ets.StringLiteral[] {
      const stringLiterals: ets.StringLiteral[] = []
      let isInRequestPermissions = false
      let isInArrayLiteralExpression = false
      let isInObjectLiteralExpression = false
      let isInObjectLiteralPropertyAssignment = false
      const walk = (node: ets.Node): void => {
        if (!isInRequestPermissions && this.ets.isPropertyAssignment(node) && node.name.getText(sourceFile).replace(LEADING_TRAILING_QUOTE_REGEX, '') === 'requestPermissions') {
          isInRequestPermissions = true
          node.forEachChild(walk)
          isInRequestPermissions = false
        }

        if (isInRequestPermissions && !isInArrayLiteralExpression && this.ets.isArrayLiteralExpression(node)) {
          isInArrayLiteralExpression = true
          node.forEachChild(walk)
          isInArrayLiteralExpression = false
        }

        if (isInRequestPermissions && isInArrayLiteralExpression && !isInObjectLiteralExpression && this.ets.isObjectLiteralExpression(node)) {
          isInObjectLiteralExpression = true
          node.forEachChild(walk)
          isInObjectLiteralExpression = false
        }

        if (isInRequestPermissions && isInArrayLiteralExpression && isInObjectLiteralExpression && !isInObjectLiteralPropertyAssignment && this.ets.isPropertyAssignment(node)) {
          isInObjectLiteralPropertyAssignment = true
          if (node.name.getText(sourceFile).replace(LEADING_TRAILING_QUOTE_REGEX, '') === 'name' && this.ets.isStringLiteral(node.initializer)) {
            stringLiterals.push(node.initializer)
          }
          node.forEachChild(walk)
          isInObjectLiteralPropertyAssignment = false
        }

        return node.forEachChild(walk)
      }
      sourceFile.forEachChild(walk)
      return stringLiterals
    }

    protected toTargetUri(pathOrUri: string): string {
      return pathOrUri.includes('://') ? pathOrUri : Uri.file(pathOrUri).toString()
    }

    async safeStat(filePath: string): Promise<FileStat | false> {
      try {
        return await this.contextUtil.getContext().env.fs?.stat(Uri.file(filePath)) ?? false
      }
      catch {
        return false
      }
    }

    async safeReadDirectory(filePath: string): Promise<[string, FileType][] | false> {
      try {
        return await this.contextUtil.getContext().env.fs?.readDirectory(Uri.file(filePath)) ?? false
      }
      catch {
        return false
      }
    }

    protected async safeReadDirectoryByUri(uri: Uri): Promise<[string, FileType][] | false> {
      try {
        return await this.contextUtil.getContext().env.fs?.readDirectory(uri) ?? false
      }
      catch {
        return false
      }
    }

    protected async safeReadFileByUri(uri: Uri): Promise<string | false> {
      try {
        return await this.contextUtil.getContext().env.fs?.readFile(uri) ?? false
      }
      catch {
        return false
      }
    }
  }

  class DefinitionProviderImpl extends ResourceProviderImpl implements DefinitionProvider {
    async findLocationLinkInElementJsonFile(document: TextDocument, position: Position, decodedUri: Uri): Promise<LocationLink[]> {
      const product = this.findProductByUri(decodedUri)
      if (!product) return []
      const elementReferences = product.findElementReference()
      if (!elementReferences.length) return []
      const currentElementReference = elementReferences.find((reference) => {
        const underlyingJsonFile = reference.getElementJsonFile().getUnderlyingElementJsonFile()
        const underlyingJsonFileUri = underlyingJsonFile.getUri()
        if (!UriUtil.isEqual(underlyingJsonFileUri.toString(), decodedUri.toString())) return false
        const underlyingReference = reference.getUnderlyingElementJsonFileReference()
        const referencePositionStart = document.positionAt(underlyingReference.getNameStart())
        const referencePositionEnd = document.positionAt(underlyingReference.getNameEnd())
        return referencePositionStart.line <= position.line && referencePositionEnd.line >= position.line && referencePositionStart.character <= position.character && referencePositionEnd.character >= position.character
      })
      if (!currentElementReference) return []

      const definitions: LocationLink[] = []
      const currentUnderlyingElementJsonFileReference = currentElementReference.getUnderlyingElementJsonFileReference()
      const originSelectionRange = Reference.toRange(currentElementReference, document, true)

      // jump to same level but not same resource qualified directory element json file
      for (const reference of elementReferences) {
        if (reference.toEtsFormat() !== currentUnderlyingElementJsonFileReference.toEtsFormat()) continue
        // If the same element json file, skip
        if (UriUtil.isEqual(reference.getUri().toString(), decodedUri.toString())) continue
        const targetRange = Reference.toRange(reference, true)
        definitions.push({
          targetUri: reference.getUri().toString(),
          targetRange,
          targetSelectionRange: targetRange,
          originSelectionRange,
        })
      }

      // jump to arkts file
      const sourceFiles = this.getReadonlySourceFiles()
      const callExpressions = sourceFiles.flatMap(sourceFile => this.globalCallExpressionFinder.findGlobalCallExpression(sourceFile, '$r'))

      for (const callExpression of callExpressions) {
        const firstArgumentText = this.globalCallExpressionFinder.getFirstArgumentText(callExpression)
        if (!firstArgumentText) continue
        if (firstArgumentText !== currentUnderlyingElementJsonFileReference.toEtsFormat()) continue
        const sourceFile = callExpression.getSourceFile()
        const targetRange = Reference.toRange(callExpression.arguments[0], true)

        definitions.push({
          targetUri: this.toTargetUri(sourceFile.fileName),
          targetRange,
          targetSelectionRange: targetRange,
          originSelectionRange,
        })
      }

      // jump to module.json5
      const moduleJson5Path = product?.getUnderlyingProduct().getModuleJson5Path()
      if (!moduleJson5Path) return definitions
      const moduleJson5Content = await this.contextUtil.getContext().env.fs?.readFile(Uri.parse(moduleJson5Path.toString())) ?? ''
      if (!moduleJson5Content) return definitions
      const sourceFile = this.ets.parseJsonText(moduleJson5Path.toString(), moduleJson5Content)
      const stringLiterals = this.findStringLiterals(sourceFile, currentUnderlyingElementJsonFileReference.toJsonFormat())
      if (stringLiterals.length === 0) return definitions
      for (const stringLiteral of stringLiterals) {
        const targetRange = Reference.toRange(stringLiteral, sourceFile, true)
        definitions.push({
          targetUri: moduleJson5Path.toString(),
          targetRange,
          targetSelectionRange: targetRange,
          originSelectionRange,
        })
      }

      return definitions
    }

    async findLocationLinkInModuleJson5(document: TextDocument, position: Position, decodedUri: Uri): Promise<LocationLink[]> {
      const product = this.findProductByUri(decodedUri)
      if (!product) return []
      const moduleJson5Path = product.getUnderlyingProduct().getModuleJson5Path()
      if (!moduleJson5Path) return []
      if (!UriUtil.isEqual(moduleJson5Path.toString(), decodedUri.toString())) return []
      const content = document.getText()
      const sourceFile = this.ets.parseJsonText(moduleJson5Path.toString(), content)
      const stringLiterals = this.findStringLiterals(sourceFile)
      const currentStringLiteral = stringLiterals.find((stringLiteral) => {
        const startPosition = document.positionAt(stringLiteral.getStart(sourceFile))
        const endPosition = document.positionAt(stringLiteral.getEnd())
        return startPosition.line <= position.line && endPosition.line >= position.line && startPosition.character <= position.character && endPosition.character >= position.character
      })
      const currentStringLiteralText = currentStringLiteral?.getText(sourceFile).replace(LEADING_TRAILING_QUOTE_REGEX, '') ?? ''
      if (!currentStringLiteral || !currentStringLiteralText) return []

      // jump to reference
      const references = product.findReference()
      if (!references.length) return []

      const originSelectionRange = Reference.toRange(currentStringLiteral, sourceFile, true)
      const definitions: LocationLink[] = []

      for (const reference of references) {
        if (reference.toJsonFormat() !== currentStringLiteralText) continue
        const targetRange = Reference.toRange(reference, true)
        definitions.push({
          targetUri: reference.getUri().toString(),
          targetRange,
          targetSelectionRange: targetRange,
          originSelectionRange,
        })
      }

      return definitions
    }

    findLocationLinkInArkts(document: TextDocument, position: Position, decodedUri: Uri): LocationLink[] | null {
      const sourceFile = this.contextUtil.decodeSourceFile(document)
      if (!sourceFile) return null
      const resourceCallExpressions = this.globalCallExpressionFinder.findGlobalCallExpression(sourceFile, '$r')
      if (resourceCallExpressions.length === 0) return null
      const currentCallExpression = this.globalCallExpressionFinder.isInCallExpression(resourceCallExpressions, sourceFile, document, position)
      if (!currentCallExpression) return null
      const firstArgumentText = this.globalCallExpressionFinder.getFirstArgumentText(currentCallExpression, sourceFile)
      if (!firstArgumentText) return null
      const [scope, type, name] = firstArgumentText.split('.')
      if (!scope || !type || !name) return null

      if (scope === 'sys') {
        return [{
          targetUri: this.toTargetUri(this.config.getSysResourcePath()),
          targetRange: emptyRange,
          targetSelectionRange: emptyRange,
          originSelectionRange: Reference.toRange(currentCallExpression.arguments[0], document, true),
        }]
      }
      else if (scope === 'app') {
        const definitions: LocationLink[] = []
        const product = this.findProductByUri(decodedUri)
        if (!product) return null

        const references = product.findReference()
        if (!references.length) return null
        const originSelectionRange = Reference.toRange(currentCallExpression.arguments[0], document, true)

        for (const reference of references) {
          if (reference.toEtsFormat() !== firstArgumentText) continue
          const targetRange = Reference.toRange(reference, true)
          definitions.push({
            targetUri: reference.getUri().toString(),
            targetRange,
            targetSelectionRange: targetRange,
            originSelectionRange,
          })
        }

        return definitions
      }
      else {
        return null
      }
    }

    async findLocationLinkInJsonLikeFile(document: TextDocument, position: Position, decodedUri: Uri): Promise<LocationLink[]> {
      return [
        ...await this.findLocationLinkInElementJsonFile(document, position, decodedUri),
        ...await this.findLocationLinkInModuleJson5(document, position, decodedUri),
      ]
    }

    async provideDefinition(document: TextDocument, position: Position): Promise<LocationLink[] | null> {
      const decodedUri = this.contextUtil.decodeTextDocumentUri(document)
      if (!decodedUri) return null

      switch (document.languageId) {
        case 'json':
        case 'jsonc':
        case 'json5':
          return this.findLocationLinkInJsonLikeFile(document, position, decodedUri)
        default:
          return this.findLocationLinkInArkts(document, position, decodedUri)
      }
    }
  }

  class CompletionProviderImpl extends ResourceProviderImpl implements CompletionProvider {
    async getModuleJson5CompletionList(document: TextDocument, position: Position, decodedUri: Uri, triggerCharacter: string): Promise<CompletionItem[]> {
      const product = this.findProductByUri(decodedUri)
      if (!product) return []
      const moduleJson5Path = product.getUnderlyingProduct().getModuleJson5Path()
      if (!UriUtil.isEqual(moduleJson5Path.toString(), decodedUri.toString())) return []
      const sourceFile = this.ets.parseJsonText(moduleJson5Path.toString(), document.getText())
      const items: CompletionItem[] = []

      // completion for requestPermissions
      // The structure of requestPermissions is:
      // {
      //   // PropertyAssignment
      //   "requestPermissions": [ // ArrayLiteralExpression
      //     {
      //       // PropertyAssignment
      //       name: "permissionName", // StringLiteral
      //     }
      //   ]
      // }
      const requestPermissionsStringLiterals = this.getRequestPermissionsStringLiterals(sourceFile)
      const currentRequestPermissionsStringLiteral = requestPermissionsStringLiterals.find((stringLiteral) => {
        const startPosition = document.positionAt(stringLiteral.getStart(sourceFile))
        const endPosition = document.positionAt(stringLiteral.getEnd())
        return startPosition.line <= position.line && endPosition.line >= position.line
          && startPosition.character <= position.character && endPosition.character >= position.character
      })
      const currentRequestPermissionsStringLiteralText = currentRequestPermissionsStringLiteral?.getText(sourceFile).replace(LEADING_TRAILING_QUOTE_REGEX, '') ?? ''
      if (currentRequestPermissionsStringLiteral) {
        for (const permissionName of Object.keys(permissions)) {
          if (!permissionName.startsWith(currentRequestPermissionsStringLiteralText)) continue
          const suffix = permissionName.slice(currentRequestPermissionsStringLiteralText.length)

          items.push({
            label: permissionName,
            kind: CompletionItemKind.Value,
            detail: permissions[permissionName].description,
            insertText: (currentRequestPermissionsStringLiteralText && permissionName.length > currentRequestPermissionsStringLiteralText.length) ? suffix : permissionName,
            documentation: {
              kind: MarkupKind.Markdown,
              value: `### ${permissions[permissionName].description}\n- 1️⃣ 权限级别: ${permissions[permissionName].level}\n- 🧀 权限类型: ${permissions[permissionName].type}\n- 🔑 授权方式: ${permissions[permissionName].grantMode}\n- 📦 起始版本: ${permissions[permissionName].startVersion}\n${permissions[permissionName].note ? `- 📝 其他说明: ${permissions[permissionName].note}` : ''}`,
            },
          })
        }
        return items
      }

      const stringLiterals = this.findStringLiterals(sourceFile)
      const currentStringLiteral = stringLiterals.find((stringLiteral) => {
        const startPosition = document.positionAt(stringLiteral.getStart(sourceFile))
        const endPosition = document.positionAt(stringLiteral.getEnd())
        return startPosition.line <= position.line && endPosition.line >= position.line
          && startPosition.character <= position.character && endPosition.character >= position.character
      })
      const stringLiteralText = currentStringLiteral?.getText(sourceFile).replace(LEADING_TRAILING_QUOTE_REGEX, '')
      if (!currentStringLiteral || !stringLiteralText) return []

      // completion for file system
      if (triggerCharacter === '/') {
        const moduleJson5Uri = Uri.parse(moduleJson5Path.toString())
        const fileUri = Uri.resolvePath(Uri.dirname(moduleJson5Uri), stringLiteralText)
        const filePath = fileUri.fsPath
        const fileStat = await this.safeStat(filePath)
        if (fileStat) {
          if (fileStat.type === FileType.Directory) {
            const files = await this.safeReadDirectory(filePath)
            if (!files || files.length === 0) return []
            for (const [fileName, fileType] of files) {
              items.push({
                label: fileName,
                kind: fileType === FileType.Directory ? CompletionItemKind.Folder : CompletionItemKind.File,
              })
            }
          }
          else if (fileStat.type === FileType.File) {
            items.push({
              label: Uri.basename(fileUri),
              kind: CompletionItemKind.File,
            })
          }
          return items
        }
      }

      // completion for reference
      const uniqueJsonFormats = [...new Set(product.findReference().map(reference => reference.toJsonFormat()))]
      for (const jsonFormat of uniqueJsonFormats) {
        if (!jsonFormat.startsWith(stringLiteralText)) continue
        const split = jsonFormat.split(stringLiteralText)

        items.push({
          label: jsonFormat,
          kind: CompletionItemKind.Value,
          detail: jsonFormat,
          insertText: (stringLiteralText && split.length > 1) ? split[1] : jsonFormat,
        })
      }

      return items
    }

    getArktsCompletionList(document: TextDocument, position: Position, decodedUri: Uri, triggerCharacter: string): CompletionItem[] {
      if (triggerCharacter === ':' || triggerCharacter === '$') return []
      const sourceFile = this.contextUtil.decodeSourceFile(document)
      if (!sourceFile) return []
      const resourceCallExpressions = this.globalCallExpressionFinder.findGlobalCallExpression(sourceFile, '$r')
      if (resourceCallExpressions.length === 0) return []
      const currentCallExpression = this.globalCallExpressionFinder.isInCallExpression(resourceCallExpressions, sourceFile, document, position)
      if (!currentCallExpression) return []
      const firstArgumentText = this.globalCallExpressionFinder.getFirstArgumentText(currentCallExpression, sourceFile)
      if (!firstArgumentText) return []
      const sysResource = this.config.getSysResource()
      const sysEtsFormats = sysResource ? SysResource.toEtsFormat(sysResource) : []
      const product = this.findProductByUri(decodedUri)
      if (!product) return []

      const items: CompletionItem[] = []

      if (!firstArgumentText.startsWith('app')) {
        for (const sysEtsFormat of sysEtsFormats) {
          const split = sysEtsFormat.split(firstArgumentText)
          if (split.length < 2) continue
          items.push({
            label: sysEtsFormat,
            kind: CompletionItemKind.Value,
            detail: sysEtsFormat,
            insertText: (firstArgumentText && split.length > 1) ? split[1] : sysEtsFormat,
          })
        }
      }

      if (!firstArgumentText.startsWith('sys')) {
        const uniqueEtsFormats = [...new Set(product.findReference().map(reference => reference.toEtsFormat()))]
        for (const etsFormat of uniqueEtsFormats) {
          const split = etsFormat.split(firstArgumentText)
          if (split.length < 2) continue

          items.push({
            label: etsFormat,
            kind: CompletionItemKind.Value,
            detail: etsFormat,
            insertText: (firstArgumentText && split.length > 1) ? split[1] : etsFormat,
          })
        }
      }

      return items
    }

    async provideCompletionItems(document: TextDocument, position: Position, context: CompletionContext): Promise<CompletionList | null> {
      const decodedUri = this.contextUtil.decodeTextDocumentUri(document)
      if (!decodedUri) return null

      switch (document.languageId) {
        case 'json':
        case 'jsonc':
        case 'json5':
          return {
            items: await this.getModuleJson5CompletionList(document, position, decodedUri, context.triggerCharacter ?? ''),
            isIncomplete: false,
          }
        default:
          return {
            items: this.getArktsCompletionList(document, position, decodedUri, context.triggerCharacter ?? ''),
            isIncomplete: false,
          }
      }
    }
  }

  class DiagnosticProviderImpl extends ResourceProviderImpl implements DiagnosticProvider {
    getArktsDiagnostics(document: TextDocument, decodedUri: Uri): Diagnostic[] {
      const sourceFile = this.contextUtil.decodeSourceFile(document)
      if (!sourceFile) return []
      const resourceCallExpressions = this.globalCallExpressionFinder.findGlobalCallExpression(sourceFile, '$r')
      if (resourceCallExpressions.length === 0) return []

      const diagnostics: Diagnostic[] = []

      for (const resourceCallExpression of resourceCallExpressions) {
        const resourceValue = this.globalCallExpressionFinder.getFirstArgumentText(resourceCallExpression, sourceFile)
        if (resourceValue === undefined) continue
        if (resourceValue === '') {
          diagnostics.push({
            message: 'Resource value is empty',
            range: Reference.toRange(resourceCallExpression.arguments[0], sourceFile, true),
            severity: DiagnosticSeverity.Error,
            code: 'RESOURCE_NOT_PROVIDED',
            source: 'ets',
            codeDescription: {
              href: 'https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/resource-categories-and-access#资源访问',
            },
          })
          continue
        }

        if (resourceValue.startsWith('sys')) {
          const sysResource = this.config.getSysResource()
          const sysEtsFormats = sysResource ? SysResource.toEtsFormat(sysResource) : []
          if (!sysResource) continue
          if (!sysEtsFormats.includes(resourceValue)) {
            diagnostics.push({
              message: `Resource ${resourceValue} not found in current scope. Indexed system resources: ${this.config.getSysResourcePath()}`,
              range: Reference.toRange(resourceCallExpression.arguments[0], sourceFile, true),
              severity: DiagnosticSeverity.Error,
              code: 'SYS_RESOURCE_NOT_FOUND',
              codeDescription: {
                href: 'https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/resource-categories-and-access#资源访问',
              },
              source: 'ets',
            })
          }
          continue
        }
        else if (resourceValue.startsWith('app')) {
          const product = this.findProductByUri(decodedUri)
          if (!product) continue
          const references = product.findReference()
          if (!references.length) continue
          const reference = references.find(reference => reference.toEtsFormat() === resourceValue)
          if (reference) continue

          diagnostics.push({
            message: `Resource ${resourceValue} not found in current scope. Indexed application resources: ${product.findAll().map(resource => resource.getUnderlyingResource().getUri()).join(', ')}`,
            range: Reference.toRange(resourceCallExpression.arguments[0], sourceFile, true),
            severity: DiagnosticSeverity.Error,
            code: 'APP_RESOURCE_NOT_FOUND',
            codeDescription: {
              href: 'https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/resource-categories-and-access#资源访问',
            },
            source: 'ets',
          })
        }
        else {
          diagnostics.push({
            message: `Invalid resource scope: ${resourceValue}, expected starts with \`sys\` or \`app\``,
            range: Reference.toRange(resourceCallExpression.arguments[0], sourceFile, true),
            severity: DiagnosticSeverity.Error,
            code: 'INVALID_RESOURCE_SCOPE',
            codeDescription: {
              href: 'https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/resource-categories-and-access#资源访问',
            },
            source: 'ets',
          })
        }
      }

      return diagnostics
    }

    private static readonly RESOURCE_TYPE = [
      'color',
      'string',
      'float',
      'boolean',
      'integer',
      'media',
      'profile',
      'symbol',
      'plural',
    ] as const

    private static isResourceType(type: string): type is (typeof DiagnosticProviderImpl.RESOURCE_TYPE)[number] {
      return DiagnosticProviderImpl.RESOURCE_TYPE.includes(type as (typeof DiagnosticProviderImpl.RESOURCE_TYPE)[number])
    }

    private static isResourceTypeWithDollar(type: string): boolean {
      const resourceType = type.slice(1)
      return DiagnosticProviderImpl.isResourceType(resourceType)
    }

    getJsonLikeDiagnostics(document: TextDocument, decodedUri: Uri): Diagnostic[] {
      const product = this.findProductByUri(decodedUri)
      if (!product) return []
      if (!UriUtil.isEqual(product.getUnderlyingProduct().getModuleJson5Path().toString(), decodedUri.toString())) return []
      const sourceFile = this.ets.parseJsonText(decodedUri.toString(), document.getText())
      const stringLiterals = this.findStringLiterals(sourceFile)

      const diagnostics: Diagnostic[] = []
      for (const stringLiteral of stringLiterals) {
        const stringLiteralText = stringLiteral.getText(sourceFile).replace(LEADING_TRAILING_QUOTE_REGEX, '')
        if (!stringLiteralText) continue
        if (!stringLiteralText.startsWith('$') && !stringLiteralText.includes(':')) continue
        const [type] = stringLiteralText.split(':')
        if (!type) continue
        if (!DiagnosticProviderImpl.isResourceTypeWithDollar(type)) {
          diagnostics.push({
            message: `Invalid resource type: ${type}, must be one of ${DiagnosticProviderImpl.RESOURCE_TYPE.map(type => `$${type}`).join(', ')}.`,
            range: Reference.toRange(stringLiteral, sourceFile, true),
            severity: DiagnosticSeverity.Error,
            code: 'INVALID_RESOURCE_TYPE',
            source: 'ets',
            codeDescription: {
              href: 'https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/resource-categories-and-access#资源访问',
            },
          })
          continue
        }

        const references = product.findReference()
        if (!references.length) continue
        const reference = references.find(reference => reference.toJsonFormat() === stringLiteralText)
        if (reference) continue

        diagnostics.push({
          message: `Resource ${stringLiteralText} not found in current scope. Indexed resources: ${product.findAll().map(resource => resource.getUnderlyingResource().getUri()).join(', ')}`,
          range: Reference.toRange(stringLiteral, sourceFile, true),
        })
      }
      return diagnostics
    }

    provideDiagnostics(document: TextDocument): NullableProviderResult<Diagnostic[]> {
      const decodedUri = this.contextUtil.decodeTextDocumentUri(document)
      if (!decodedUri) return null

      switch (document.languageId) {
        case 'json':
        case 'jsonc':
        case 'json5':
          return this.getJsonLikeDiagnostics(document, decodedUri)
        default:
          return this.getArktsDiagnostics(document, decodedUri)
      }
    }
  }

  class DocumentLinkProviderImpl extends ResourceProviderImpl implements DocumentLinkProvider {
    async provideDocumentLinks(document: TextDocument): Promise<DocumentLink[] | null> {
      const decodedUri = this.contextUtil.decodeTextDocumentUri(document)
      if (!decodedUri) return null
      const product = this.findProductByUri(decodedUri)
      if (!product) return null
      const moduleJson5Path = product.getUnderlyingProduct().getModuleJson5Path()
      if (!moduleJson5Path) return null
      const content = document.getText()
      const moduleJson5Uri = Uri.parse(moduleJson5Path.toString())
      const sourceFile = this.ets.parseJsonText(moduleJson5Path.toString(), content)
      const stringLiterals = this.findStringLiterals(sourceFile)

      const documentLinks: DocumentLink[] = []

      for (const stringLiteral of stringLiterals) {
        const currentStringLiteralText = stringLiteral.getText(sourceFile).replace(LEADING_TRAILING_QUOTE_REGEX, '')
        if (!currentStringLiteralText || currentStringLiteralText === '.') continue
        const filePath = Uri.resolvePath(Uri.dirname(moduleJson5Uri), currentStringLiteralText).fsPath
        if (await this.safeStat(filePath)) {
          documentLinks.push({
            target: this.toTargetUri(filePath),
            range: Reference.toRange(stringLiteral, sourceFile, true),
          })
        }
      }

      return documentLinks
    }
  }

  class HoverProviderImpl extends ResourceProviderImpl implements HoverProvider {
    provideHoverForRequestPermissions(document: TextDocument, position: Position): NullableProviderResult<Hover> {
      const decodedUri = this.contextUtil.decodeTextDocumentUri(document)
      if (!decodedUri) return null
      const product = this.findProductByUri(decodedUri)
      if (!product) return null
      const moduleJson5Path = product.getUnderlyingProduct().getModuleJson5Path()
      if (!moduleJson5Path) return null
      const content = document.getText()
      const sourceFile = this.ets.parseJsonText(moduleJson5Path.toString(), content)

      const requestPermissionsStringLiterals = this.getRequestPermissionsStringLiterals(sourceFile)
      const currentRequestPermissionsStringLiteral = requestPermissionsStringLiterals.find((stringLiteral) => {
        const startPosition = document.positionAt(stringLiteral.getStart(sourceFile))
        const endPosition = document.positionAt(stringLiteral.getEnd())
        return startPosition.line <= position.line && endPosition.line >= position.line
          && startPosition.character <= position.character && endPosition.character >= position.character
      })
      const currentRequestPermissionsStringLiteralText = currentRequestPermissionsStringLiteral?.getText(sourceFile).replace(LEADING_TRAILING_QUOTE_REGEX, '') ?? ''
      if (currentRequestPermissionsStringLiteral && currentRequestPermissionsStringLiteralText && permissions[currentRequestPermissionsStringLiteralText]) {
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: `### ${permissions[currentRequestPermissionsStringLiteralText].description}\n- 1️⃣ 权限级别: ${permissions[currentRequestPermissionsStringLiteralText].level}\n- 🧀 权限类型: ${permissions[currentRequestPermissionsStringLiteralText].type}\n- 🔑 授权方式: ${permissions[currentRequestPermissionsStringLiteralText].grantMode}\n- 📦 起始版本: ${permissions[currentRequestPermissionsStringLiteralText].startVersion}\n${permissions[currentRequestPermissionsStringLiteralText].note ? `- 📝 其他说明: ${permissions[currentRequestPermissionsStringLiteralText].note}` : ''}`,
          },
          range: Reference.toRange(currentRequestPermissionsStringLiteral, sourceFile, true),
        }
      }

      const stringLiterals = this.findStringLiterals(sourceFile)
      const currentStringLiteral = stringLiterals.find((stringLiteral) => {
        const startPosition = document.positionAt(stringLiteral.getStart(sourceFile))
        const endPosition = document.positionAt(stringLiteral.getEnd())
        return startPosition.line <= position.line && endPosition.line >= position.line
          && startPosition.character <= position.character && endPosition.character >= position.character
      })
      const stringLiteralText = currentStringLiteral?.getText(sourceFile).replace(LEADING_TRAILING_QUOTE_REGEX, '') ?? ''
      if (currentStringLiteral && stringLiteralText) {
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: `${product.findReference().filter(reference => reference.toJsonFormat() === stringLiteralText).map(reference => `- [${reference.getUri().toString()}](${reference.getUri().toString()})`).join('\n')}`,
          },
          range: Reference.toRange(currentStringLiteral, sourceFile, true),
        }
      }

      return null
    }

    buildDollarResourceHoverText(reference: MediaReference): string {
      const qualifiers = reference.getMediaDirectory()
        .getResourceDirectory()
        .getUnderlyingResourceDirectory()
        .getQualifiers()

      return `**🖼️ [${reference.getRawFileName()}](${reference.getUri().fsPath})**\n\n`
        .concat(`| ${simpleTranslate(this.config.getLocale(), imageHoverText.properties)} | ${simpleTranslate(this.config.getLocale(), imageHoverText.value)} |\n`)
        .concat(`|------|----|\n`)
        .concat(`| ${simpleTranslate(this.config.getLocale(), imageHoverText.fileName)} | \`${reference.getFileName()}\` |\n`)
        .concat(`| ${simpleTranslate(this.config.getLocale(), imageHoverText.fileSize)} | \`${reference.getFileSize()}\` |\n`)
        .concat(`| ${simpleTranslate(this.config.getLocale(), imageHoverText.qualifiers)} | ${typeof qualifiers === 'string' ? `\`${qualifiers}\`` : qualifiers.map(q => `\`${Object.values(q).join(' ')}\``).join(' ')} |\n\n`)
        .concat(reference.getMarkdownPreview())
    }

    provideHoverForDollarResource(document: TextDocument, position: Position): NullableProviderResult<Hover> {
      const decodedSourceFile = this.contextUtil.decodeSourceFile(document)
      if (!decodedSourceFile) return null
      const resourceCallExpressions = this.globalCallExpressionFinder.findGlobalCallExpression(decodedSourceFile, '$r')
      if (resourceCallExpressions.length === 0) return null
      const currentCallExpression = this.globalCallExpressionFinder.isInCallExpression(resourceCallExpressions, decodedSourceFile, document, position)
      if (!currentCallExpression) return null
      const firstArgumentText = this.globalCallExpressionFinder.getFirstArgumentText(currentCallExpression, decodedSourceFile)
      if (!firstArgumentText) return null
      if (!firstArgumentText.startsWith('app.media.')) return null
      const decodedUri = this.contextUtil.decodeTextDocumentUri(document)
      if (!decodedUri) return null
      const product = this.findProductByUri(decodedUri)
      const references = product?.findReference()
        .filter(reference => MediaReference.is(reference))
        .filter(reference => reference.toEtsFormat() === firstArgumentText) ?? []
      if (!references.length) return null
      const value = references.map(reference => this.buildDollarResourceHoverText(reference)).join('---\n')
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value,
        },
        range: Reference.toRange(currentCallExpression.arguments[0], decodedSourceFile, true),
      }
    }

    provideHover(document: TextDocument, position: Position): NullableProviderResult<Hover> {
      switch (document.languageId) {
        case 'json':
        case 'jsonc':
        case 'json5':
          return this.provideHoverForRequestPermissions(document, position)
        default:
          return this.provideHoverForDollarResource(document, position)
      }
    }
  }
}
