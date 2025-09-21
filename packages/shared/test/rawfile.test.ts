import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LanguageServerLogger } from '../src/log/lsp-logger'
import { parseRawfileReference, ResourceResolver } from '../src/resource-resolver'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('parseRawfileReference 基础校验', () => {
  it('valid rawfile reference', () => {
    const result = parseRawfileReference('1.html')
    expect(result).toEqual({
      filePath: '1.html',
      raw: '1.html',
    })
  })

  it('rawfile directory reference', () => {
    const result = parseRawfileReference('xxx')
    expect(result).toEqual({
      filePath: 'xxx',
      raw: 'xxx',
    })
  })

  it('rawfile nested path reference', () => {
    const result = parseRawfileReference('xxx/2/2.md')
    expect(result).toEqual({
      filePath: 'xxx/2/2.md',
      raw: 'xxx/2/2.md',
    })
  })

  it('with quotes', () => {
    const result1 = parseRawfileReference('\'1.html\'')
    const result2 = parseRawfileReference('"xxx/2/2.md"')
    const result3 = parseRawfileReference('`xxx`')

    expect(result1).toEqual({
      filePath: '1.html',
      raw: '\'1.html\'',
    })
    expect(result2).toEqual({
      filePath: 'xxx/2/2.md',
      raw: '"xxx/2/2.md"',
    })
    expect(result3).toEqual({
      filePath: 'xxx',
      raw: '`xxx`',
    })
  })

  it('invalid references', () => {
    expect(parseRawfileReference('')).toBeNull()
    expect(parseRawfileReference('  ')).toBeNull()
    expect(parseRawfileReference('\'\'')).toBeNull()
    expect(parseRawfileReference('""')).toBeNull()
    expect(parseRawfileReference('``')).toBeNull()
  })
})

describe('resourceResolver rawfile 功能', () => {
  it('能够构建rawfile索引', async () => {
    const tempDir = path.join(__dirname, 'temp-test-rawfile')
    const entryModule = path.join(tempDir, 'entry')
    const rawfileDir = path.join(entryModule, 'src', 'main', 'resources', 'rawfile')

    try {
      // 创建测试目录结构
      fs.mkdirSync(rawfileDir, { recursive: true })

      // 确保被识别为模块
      fs.writeFileSync(path.join(entryModule, 'src', 'main', 'module.json5'), '{ "foo": "bar" }')

      // 创建rawfile资源
      fs.writeFileSync(path.join(rawfileDir, '1.html'), '<html><body>Test</body></html>')
      fs.mkdirSync(path.join(rawfileDir, 'xxx'), { recursive: true })
      fs.writeFileSync(path.join(rawfileDir, 'xxx', 'README.md'), '# Test file')
      fs.mkdirSync(path.join(rawfileDir, 'xxx', '2'), { recursive: true })
      fs.writeFileSync(path.join(rawfileDir, 'xxx', '2', '2.md'), '# Another test file')

      const resolver = new ResourceResolver(new LanguageServerLogger(), tempDir)
      await resolver.buildIndex()

      // 测试文件解析
      const htmlResult = await resolver.resolveRawfileReference('1.html')
      expect(htmlResult).not.toBeNull()
      expect(htmlResult?.fileType).toBe('file')
      expect(htmlResult?.relativePath).toBe('1.html')
      expect(htmlResult?.uri.includes('1.html')).toBe(true)

      // 测试目录解析
      const dirResult = await resolver.resolveRawfileReference('xxx')
      expect(dirResult).not.toBeNull()
      expect(dirResult?.fileType).toBe('directory')
      expect(dirResult?.relativePath).toBe('xxx')

      // 测试获取所有rawfile资源
      const allRawfiles = resolver.getAllRawfileResources()
      console.log('Found rawfile resources:', allRawfiles.map(r => ({ path: r.reference.filePath, type: r.location.fileType })))
      expect(allRawfiles.length).toBeGreaterThan(0)
      const filePaths = allRawfiles.map(r => r.reference.filePath)
      expect(filePaths).toContain('1.html')
      expect(filePaths).toContain('xxx')
      expect(filePaths).toContain('xxx/2/2.md')
    }
    finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    }
  })
})
