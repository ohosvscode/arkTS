import type { FormatterConfigFs } from '../src/utils/formatter-config'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import {
  formatEtsDocument,
  parseJsonc,
  pickFormatterOptions,
  resolveFormatterConfig,
  stripJsonComments,
  toDocumentFsPath,
} from '../src/utils/formatter-config'

function createMemoryFs(files: Record<string, string>): FormatterConfigFs {
  const normalized = new Map(
    Object.entries(files).map(([filePath, content]) => [path.normalize(filePath), content]),
  )
  return {
    async isFile(filePath) {
      return normalized.has(path.normalize(filePath))
    },
    async readFile(filePath) {
      const content = normalized.get(path.normalize(filePath))
      if (content === undefined) throw new Error(`ENOENT: ${filePath}`)
      return content
    },
  }
}

describe('toDocumentFsPath', () => {
  it('returns filesystem paths unchanged', () => {
    expect(toDocumentFsPath('/workspace/entry.ets')).toBe('/workspace/entry.ets')
  })

  it('converts file URIs to filesystem paths', () => {
    expect(toDocumentFsPath('file:///workspace/entry.ets')).toBe('/workspace/entry.ets')
  })

  it('ignores untitled documents', () => {
    expect(toDocumentFsPath('untitled:Untitled-1')).toBeUndefined()
  })
})

describe('stripJsonComments / parseJsonc', () => {
  it('keeps comment-like text inside strings', () => {
    expect(stripJsonComments('{"url": "https://example.com//path"}')).toBe('{"url": "https://example.com//path"}')
  })

  it('parses jsonc with comments and trailing commas', () => {
    expect(parseJsonc(`{
      // line comment
      "singleQuote": true, /* block */
      "printWidth": 80,
    }`)).toEqual({
      singleQuote: true,
      printWidth: 80,
    })
  })
})

describe('pickFormatterOptions', () => {
  it('keeps prettier/oxfmt keys and drops schema and plugins', () => {
    expect(pickFormatterOptions({
      $schema: './node_modules/oxfmt/configuration_schema.json',
      printWidth: 80,
      singleQuote: true,
      plugins: ['prettier-plugin-foo'],
      ignorePatterns: ['dist/**'],
    })).toEqual({
      printWidth: 80,
      singleQuote: true,
    })
  })

  it('returns undefined when no known format keys exist', () => {
    expect(pickFormatterOptions({ $schema: 'x' })).toBeUndefined()
  })
})

describe('resolveFormatterConfig', () => {
  it('prefers .oxfmtrc.json over .prettierrc.json in the same directory', async () => {
    const root = path.join('/tmp', 'fmt-prefer')
    const documentPath = path.join(root, 'src', 'entry.ets')
    const resolved = await resolveFormatterConfig(documentPath, createMemoryFs({
      [path.join(root, 'src', '.prettierrc.json')]: '{"printWidth": 120}',
      [path.join(root, 'src', '.oxfmtrc.json')]: '{"printWidth": 80, "singleQuote": true}',
    }))

    expect(resolved).toEqual({
      path: path.join(root, 'src', '.oxfmtrc.json'),
      options: { printWidth: 80, singleQuote: true },
    })
  })

  it('walks up to a parent .prettierrc.json', async () => {
    const root = path.join('/tmp', 'fmt-walk')
    const documentPath = path.join(root, 'entry', 'src', 'pages', 'Index.ets')
    const resolved = await resolveFormatterConfig(documentPath, createMemoryFs({
      [path.join(root, 'entry', '.prettierrc.json')]: '{"tabWidth": 4, "semi": false}',
    }))

    expect(resolved).toEqual({
      path: path.join(root, 'entry', '.prettierrc.json'),
      options: { tabWidth: 4, semi: false },
    })
  })

  it('reads prettier options from package.json', async () => {
    const root = path.join('/tmp', 'fmt-pkg')
    const documentPath = path.join(root, 'Index.ets')
    const resolved = await resolveFormatterConfig(documentPath, createMemoryFs({
      [path.join(root, 'package.json')]: '{"name":"demo","prettier":{"useTabs":true,"printWidth":90}}',
    }))

    expect(resolved).toEqual({
      path: path.join(root, 'package.json'),
      options: { useTabs: true, printWidth: 90 },
    })
  })

  it('skips package.json without a prettier object and keeps walking', async () => {
    const root = path.join('/tmp', 'fmt-pkg-skip')
    const documentPath = path.join(root, 'module', 'Index.ets')
    const resolved = await resolveFormatterConfig(documentPath, createMemoryFs({
      [path.join(root, 'module', 'package.json')]: '{"name":"module"}',
      [path.join(root, '.oxfmtrc.jsonc')]: `{
        // project default
        "singleQuote": true,
      }`,
    }))

    expect(resolved).toEqual({
      path: path.join(root, '.oxfmtrc.jsonc'),
      options: { singleQuote: true },
    })
  })

  it('skips an invalid nearest config and uses the next valid file', async () => {
    const root = path.join('/tmp', 'fmt-invalid')
    const documentPath = path.join(root, 'Index.ets')
    const resolved = await resolveFormatterConfig(documentPath, createMemoryFs({
      [path.join(root, '.oxfmtrc.json')]: '{ not json',
      [path.join(root, '.prettierrc.json')]: '{"trailingComma":"es5"}',
    }))

    expect(resolved).toEqual({
      path: path.join(root, '.prettierrc.json'),
      options: { trailingComma: 'es5' },
    })
  })

  it('returns a config path with empty options when the file only has $schema', async () => {
    const root = path.join('/tmp', 'fmt-schema')
    const documentPath = path.join(root, 'Index.ets')
    const resolved = await resolveFormatterConfig(documentPath, createMemoryFs({
      [path.join(root, '.oxfmtrc.json')]: '{"$schema":"./schema.json"}',
      [path.join(root, '.prettierrc.json')]: '{"printWidth": 120}',
    }))

    expect(resolved).toEqual({
      path: path.join(root, '.oxfmtrc.json'),
      options: undefined,
    })
  })

  it('loads a real .oxfmtrc.json from disk', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'arkts-fmt-config-'))
    try {
      const nested = path.join(root, 'entry', 'src')
      await fs.mkdir(nested, { recursive: true })
      await fs.writeFile(path.join(root, '.oxfmtrc.json'), '{\n  "printWidth": 80,\n  "singleQuote": true\n}\n', 'utf8')
      const documentPath = path.join(nested, 'Index.ets')
      await fs.writeFile(documentPath, 'const name = "ark"\n', 'utf8')

      const resolved = await resolveFormatterConfig(documentPath)
      expect(resolved).toEqual({
        path: path.join(root, '.oxfmtrc.json'),
        options: { printWidth: 80, singleQuote: true },
      })
    }
    finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})

describe('oxk format options', () => {
  it('applies prettier-style options from a resolved config file', async () => {
    const { format } = await import('@ohos-rs/oxk')
    const result = await formatEtsDocument(
      {
        uri: 'file:///tmp/fmt-oxk/src/entry.ets',
        text: 'const name = "arkts"; const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];',
      },
      format,
      createMemoryFs({
        '/tmp/fmt-oxk/.prettierrc.json': '{"singleQuote":true,"printWidth":40}',
      }),
    )

    expect(result.errors).toEqual([])
    expect(result.code).toContain('const name = \'arkts\'')
    expect(result.code).toContain('\n')
  })
})

describe('formatEtsDocument', () => {
  it('passes resolved options and a filesystem path to oxk format', async () => {
    const calls: unknown[] = []
    const result = await formatEtsDocument(
      {
        uri: 'file:///tmp/fmt-format/src/entry.ets',
        text: `const name = "ark"`,
      },
      async (filename, sourceText, options) => {
        calls.push({ filename, sourceText, options })
        return { code: sourceText, errors: [] }
      },
      createMemoryFs({
        '/tmp/fmt-format/.prettierrc.json': '{"singleQuote":true,"printWidth":80}',
      }),
    )

    expect(result).toEqual({ code: `const name = "ark"`, errors: [] })
    expect(calls).toEqual([{
      filename: '/tmp/fmt-format/src/entry.ets',
      sourceText: `const name = "ark"`,
      options: { singleQuote: true, printWidth: 80 },
    }])
  })

  it('formats untitled documents without looking up a config file', async () => {
    const calls: unknown[] = []
    await formatEtsDocument(
      { uri: 'untitled:Untitled-1', text: 'const x = 1' },
      async (filename, sourceText, options) => {
        calls.push({ filename, sourceText, options })
        return { code: sourceText, errors: [] }
      },
    )

    expect(calls).toEqual([{
      filename: 'untitled:Untitled-1',
      sourceText: 'const x = 1',
      options: undefined,
    }])
  })
})
