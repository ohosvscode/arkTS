import type { LanguageServicePlugin } from '@volar/language-server'
import type { CreateArkTServiceOptions } from '.'
import { Color, Range, TextEdit } from '@volar/language-server'
import { ContextUtil } from '../utils/context-util'

function toHexDigit(char: string): number {
  const code = char.charCodeAt(0)
  if (code >= 48 && code <= 57) return code - 48
  const lower = code >= 97 ? code : code + 32
  if (lower >= 97 && lower <= 102) return lower - 87
  return 0
}

function parseHexPair(text: string, start: number): number {
  return (toHexDigit(text[start]) * 16 + toHexDigit(text[start + 1])) / 255
}

function parseColorExpression(value: string): ReturnType<typeof Color.create> | null {
  const normalized = value.trim()
  if (!normalized.startsWith('#')) return null

  switch (normalized.length) {
    case 4: // #RGB
      return Color.create(
        (toHexDigit(normalized[1]) * 17) / 255,
        (toHexDigit(normalized[2]) * 17) / 255,
        (toHexDigit(normalized[3]) * 17) / 255,
        1,
      )
    case 5: // #ARGB
      return Color.create(
        (toHexDigit(normalized[2]) * 17) / 255,
        (toHexDigit(normalized[3]) * 17) / 255,
        (toHexDigit(normalized[4]) * 17) / 255,
        (toHexDigit(normalized[1]) * 17) / 255,
      )
    case 7: // #RRGGBB
      return Color.create(
        parseHexPair(normalized, 1),
        parseHexPair(normalized, 3),
        parseHexPair(normalized, 5),
        1,
      )
    case 9: // #AARRGGBB
      return Color.create(
        parseHexPair(normalized, 3),
        parseHexPair(normalized, 5),
        parseHexPair(normalized, 7),
        parseHexPair(normalized, 1),
      )
    default:
      return null
  }
}

function toTwoDigitHex(value: number): string {
  const normalized = Math.max(0, Math.min(255, Math.round(value)))
  return normalized.toString(16).padStart(2, '0')
}

function toHexPresentation(color: { red: number, green: number, blue: number, alpha: number }): string {
  const red = toTwoDigitHex(color.red * 255)
  const green = toTwoDigitHex(color.green * 255)
  const blue = toTwoDigitHex(color.blue * 255)
  const alpha = toTwoDigitHex(color.alpha * 255)
  return `#${alpha}${red}${green}${blue}`.toUpperCase()
}

export function createArkTSColors(ctx: CreateArkTServiceOptions): LanguageServicePlugin {
  return {
    capabilities: {
      colorProvider: true,
    },
    create(context) {
      const contextUtil = new ContextUtil(context)
      const regex = /^#[a-f0-9]{3,4}$|^#[a-f0-9]{6}$|^#[a-f0-9]{8}$|^\$.*/i

      return {
        async provideDocumentColors(document) {
          if (document.languageId !== 'json' && document.languageId !== 'jsonc' && document.languageId !== 'json5') return null
          const decodedUri = contextUtil.decodeTextDocumentUri(document)
          if (!decodedUri) return null
          const elementJsonFile = ctx.getProjectDetectorManager()
            ?.findByUri(decodedUri.toString())
            ?.findByUri(decodedUri.toString())
            ?.findByUri(decodedUri.toString())
            ?.findByUri(decodedUri.toString())
            ?.findByUri(decodedUri.toString())
            ?.findByUri(decodedUri.toString())
            ?.getElementDirectory()
            ?.findByUri(decodedUri.toString())
          if (!elementJsonFile) return null

          return elementJsonFile.findAll().flatMap((item) => {
            const valueText = item.getUnderlyingElementJsonFileReference().getValueText().trim()
            if (!regex.test(valueText)) return []

            const color = parseColorExpression(valueText)
            if (!color) return []

            return {
              range: Range.create(
                document.positionAt(item.getUnderlyingElementJsonFileReference().getValueStart() + 1),
                document.positionAt(item.getUnderlyingElementJsonFileReference().getValueEnd() - 1),
              ),
              color,
            }
          })
        },

        async provideColorPresentations(document, color, range) {
          if (document.languageId !== 'json' && document.languageId !== 'jsonc' && document.languageId !== 'json5') return null
          const decodedUri = contextUtil.decodeTextDocumentUri(document)
          if (!decodedUri) return null
          const elementJsonFile = ctx.getProjectDetectorManager()
            ?.findByUri(decodedUri.toString())
            ?.findByUri(decodedUri.toString())
            ?.findByUri(decodedUri.toString())
            ?.findByUri(decodedUri.toString())
            ?.findByUri(decodedUri.toString())
            ?.findByUri(decodedUri.toString())
            ?.getElementDirectory()
            ?.findByUri(decodedUri.toString())
          if (!elementJsonFile) return null

          const elementJsonFileReferences = elementJsonFile.findAll()
          const reference = elementJsonFileReferences.find((reference) => {
            if (document.offsetAt(range.start) !== reference.getUnderlyingElementJsonFileReference().getValueStart() + 1) return undefined
            if (document.offsetAt(range.end) !== reference.getUnderlyingElementJsonFileReference().getValueEnd() - 1) return undefined
            return reference
          })
          if (!reference) return []

          const hex = toHexPresentation(color)

          return [
            {
              label: hex,
              textEdit: TextEdit.replace(
                range,
                hex,
              ),
            },
          ]
        },
      }
    },
  }
}
