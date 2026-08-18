import fs from 'node:fs/promises'
import path from 'node:path'
import { Uri } from '@vstils/core'

/** Prettier / oxfmt option keys that oxk's `format(..., options)` accepts. */
export const FORMATTER_OPTION_KEYS = [
  'printWidth',
  'tabWidth',
  'useTabs',
  'semi',
  'singleQuote',
  'jsxSingleQuote',
  'quoteProps',
  'trailingComma',
  'bracketSpacing',
  'bracketSameLine',
  'arrowParens',
  'endOfLine',
  'singleAttributePerLine',
  'objectWrap',
  'embeddedLanguageFormatting',
  'insertFinalNewline',
] as const

export type FormatterOptionKey = typeof FORMATTER_OPTION_KEYS[number]
export type FormatterOptions = Partial<Record<FormatterOptionKey, unknown>>

/** Nearest-directory lookup order. oxfmt files win over Prettier files. */
export const FORMATTER_CONFIG_FILENAMES = [
  '.oxfmtrc.json',
  '.oxfmtrc.jsonc',
  '.prettierrc.json',
  '.prettierrc.jsonc',
  '.prettierrc',
] as const

export interface FormatterConfigFs {
  isFile(filePath: string): Promise<boolean>
  readFile(filePath: string): Promise<string>
}

export interface ResolvedFormatterConfig {
  path: string
  options?: FormatterOptions
}

const defaultFs: FormatterConfigFs = {
  async isFile(filePath) {
    try {
      const stat = await fs.stat(filePath)
      return stat.isFile()
    }
    catch {
      return false
    }
  },
  readFile(filePath) {
    return fs.readFile(filePath, 'utf8')
  },
}

function isUriWithScheme(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value) || value.startsWith('file:') || value.startsWith('untitled:')
}

/**
 * Convert a document URI or filesystem path to a local path used for config walk.
 * Non-file schemes (untitled, etc.) return `undefined` so formatting still runs with defaults.
 */
export function toDocumentFsPath(documentUri: string): string | undefined {
  if (!documentUri) return undefined
  if (!isUriWithScheme(documentUri)) return documentUri
  try {
    const uri = Uri.parse(documentUri)
    if (uri.scheme !== 'file') return undefined
    return uri.fsPath
  }
  catch {
    return undefined
  }
}

/** Strip `//` and `/* *\/` comments while preserving string contents. */
export function stripJsonComments(text: string): string {
  let result = ''
  let index = 0
  let inString: '"' | '\'' | '`' | null = null
  let escaped = false

  while (index < text.length) {
    const char = text[index]
    const next = text[index + 1]

    if (inString) {
      result += char
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === inString) inString = null
      index++
      continue
    }

    if (char === '"' || char === '\'' || char === '`') {
      inString = char
      result += char
      index++
      continue
    }

    if (char === '/' && next === '/') {
      index += 2
      while (index < text.length && text[index] !== '\n') index++
      continue
    }

    if (char === '/' && next === '*') {
      index += 2
      while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) index++
      index = Math.min(index + 2, text.length)
      result += ' '
      continue
    }

    result += char
    index++
  }

  return result
}

function stripTrailingCommas(text: string): string {
  return text.replace(/,(\s*[}\]])/g, '$1')
}

export function parseJsonc(text: string): unknown {
  const stripped = stripJsonComments(text)
  try {
    return JSON.parse(stripped)
  }
  catch {
    return JSON.parse(stripTrailingCommas(stripped))
  }
}

export function pickFormatterOptions(raw: unknown): FormatterOptions | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const record = raw as Record<string, unknown>
  const options: FormatterOptions = {}
  for (const key of FORMATTER_OPTION_KEYS) {
    if (record[key] !== undefined) options[key] = record[key]
  }
  return Object.keys(options).length > 0 ? options : undefined
}

function parseConfigFile(fileName: string, text: string): FormatterOptions | undefined | false {
  try {
    if (fileName === 'package.json') {
      const pkg = parseJsonc(text) as { prettier?: unknown } | undefined
      if (!pkg || typeof pkg !== 'object') return false
      if (pkg.prettier === undefined) return false
      if (!pkg.prettier || typeof pkg.prettier !== 'object' || Array.isArray(pkg.prettier)) return false
      return pickFormatterOptions(pkg.prettier)
    }
    return pickFormatterOptions(parseJsonc(text))
  }
  catch {
    return false
  }
}

export async function resolveFormatterConfig(
  documentPath: string,
  fileSystem: FormatterConfigFs = defaultFs,
): Promise<ResolvedFormatterConfig | undefined> {
  if (!documentPath) return undefined

  let directory = path.dirname(path.resolve(documentPath))
  const seen = new Set<string>()

  while (!seen.has(directory)) {
    seen.add(directory)

    for (const fileName of FORMATTER_CONFIG_FILENAMES) {
      const configPath = path.join(directory, fileName)
      if (!await fileSystem.isFile(configPath)) continue
      try {
        const parsed = parseConfigFile(fileName, await fileSystem.readFile(configPath))
        if (parsed === false) continue
        return { path: configPath, options: parsed || undefined }
      }
      catch {
        continue
      }
    }

    const packageJsonPath = path.join(directory, 'package.json')
    if (await fileSystem.isFile(packageJsonPath)) {
      try {
        const parsed = parseConfigFile('package.json', await fileSystem.readFile(packageJsonPath))
        if (parsed !== false) return { path: packageJsonPath, options: parsed || undefined }
      }
      catch {
        // keep walking when package.json is unreadable or has no prettier field
      }
    }

    const parent = path.dirname(directory)
    if (parent === directory) break
    directory = parent
  }

  return undefined
}

export interface FormatDocumentInput {
  uri: string
  text: string
}

export interface FormatDocumentResult {
  code: string
  errors: string[]
}

export async function formatEtsDocument(
  textDocument: FormatDocumentInput,
  formatImpl: (filename: string, sourceText: string, options?: FormatterOptions) => Promise<FormatDocumentResult> | FormatDocumentResult,
  fileSystem: FormatterConfigFs = defaultFs,
): Promise<FormatDocumentResult> {
  const fsPath = toDocumentFsPath(textDocument.uri)
  const filename = fsPath ?? textDocument.uri
  const config = fsPath ? await resolveFormatterConfig(fsPath, fileSystem) : undefined
  return formatImpl(filename, textDocument.text, config?.options)
}
