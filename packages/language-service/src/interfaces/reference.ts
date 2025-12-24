import type { Uri } from '@arkts/project-detector'
import type { Node, SourceFile } from 'ohos-typescript'
import { Range, TextDocument } from '@volar/language-server'
import { ElementJsonFileReference } from './element-json-file-reference'

export interface Reference {
  getUri(): Uri
  getStart(): number
  getEnd(): number
}

export namespace Reference {
  function isTextDocument(value: unknown): value is TextDocument {
    return typeof value === 'object'
      && value !== null
      && 'positionAt' in value
      && typeof value.positionAt === 'function'
      && 'getText' in value
      && typeof value.getText === 'function'
  }

  export function is(value: unknown): value is Reference {
    return typeof value === 'object'
      && value !== null
      && 'getUri' in value
      && typeof value.getUri === 'function'
      && 'getStart' in value
      && typeof value.getStart === 'function'
      && 'getEnd' in value
      && typeof value.getEnd === 'function'
  }

  /**
   * Convert the {@linkcode Reference} or ohos-typescript {@linkcode Node} to a {@linkcode Range}.
   */
  export function toRange(reference: Reference, document?: TextDocument, withoutQuotes?: true): Range
  /**
   * Convert the {@linkcode Reference} or ohos-typescript {@linkcode Node} to a {@linkcode Range}.
   */
  export function toRange(reference: Reference, withoutQuotes?: true): Range
  /**
   * Convert the {@linkcode Reference} or ohos-typescript {@linkcode Node} to a {@linkcode Range}.
   *
   * @description When the node is filtered by `Node.forEachChild` the original sourceFile
   * is not available, if we got an `cannot read properties of undefined
   * (reading 'text')` error, we must pass the original {@linkcode SourceFile}
   * to the function.
   */
  export function toRange<T extends Node>(node: T, document?: TextDocument | SourceFile, withoutQuotes?: true): Range
  /**
   * Convert the {@linkcode Reference} or ohos-typescript {@linkcode Node} to a {@linkcode Range}.
   */
  export function toRange<T extends Node>(node: T, withoutQuotes?: true): Range
  export function toRange(reference: Reference | Node, documentOrSourceFileOrWithoutQuotes?: TextDocument | SourceFile | true, withoutQuotes?: true): Range {
    if (is(reference)) {
      const document = isTextDocument(documentOrSourceFileOrWithoutQuotes)
        ? documentOrSourceFileOrWithoutQuotes
        : ElementJsonFileReference.is(reference)
          ? TextDocument.create('file://', 'json', 0, reference.getElementJsonFile().getUnderlyingElementJsonFile().getContent())
          : TextDocument.create('file://', 'text', 0, '')
      const start = (withoutQuotes === true || documentOrSourceFileOrWithoutQuotes === true) ? reference.getStart() + 1 : reference.getStart()
      const end = (withoutQuotes === true || documentOrSourceFileOrWithoutQuotes === true) ? reference.getEnd() - 1 : reference.getEnd()
      return Range.create(
        document.positionAt(start),
        document.positionAt(end),
      )
    }
    else {
      const sourceFile = !isTextDocument(documentOrSourceFileOrWithoutQuotes) && documentOrSourceFileOrWithoutQuotes !== true ? documentOrSourceFileOrWithoutQuotes : reference.getSourceFile()
      const document = isTextDocument(documentOrSourceFileOrWithoutQuotes)
        ? documentOrSourceFileOrWithoutQuotes
        : TextDocument.create(sourceFile?.fileName ?? 'file://', sourceFile ? 'typescript' : 'text', 0, sourceFile?.getText() ?? '')
      const start = (withoutQuotes === true || documentOrSourceFileOrWithoutQuotes === true) ? reference.getStart(sourceFile) + 1 : reference.getStart(sourceFile)
      const end = (withoutQuotes === true || documentOrSourceFileOrWithoutQuotes === true) ? reference.getEnd() - 1 : reference.getEnd()
      return Range.create(
        document.positionAt(start),
        document.positionAt(end),
      )
    }
  }
}

export interface ResourceReference extends Reference {
  toEtsFormat(): `app.${string}.${string}`
  toJsonFormat(): `$${string}:${string}`
}
