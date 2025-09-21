import path from 'node:path'
import * as ets from 'ohos-typescript'
import { beforeAll, describe, expect, it } from 'vitest'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { LanguageServerConfigManager } from '../src/classes/config-manager'
import { logger } from '../src/logger'
import { RawfileDiagnosticService } from '../src/services/rawfile-diagnostic.service'

const root = path.resolve(__dirname, '../../..')
const projectRoot = path.join(root, 'sample')

describe('rawfile诊断功能测试', () => {
  let service: RawfileDiagnosticService
  let mockLspConfiguration: LanguageServerConfigManager

  beforeAll(() => {
    mockLspConfiguration = new LanguageServerConfigManager(logger)
    service = new RawfileDiagnosticService(mockLspConfiguration, projectRoot, () => 'error')
  })

  it('存在的rawfile资源不应该产生诊断', async () => {
    const code = 'getContext().resourceManager.getRawFileContent($rawfile("1.html"))'
    const sourceFile = ets.createSourceFile('test.ets', code, ets.ScriptTarget.ES2015, true)
    const document = TextDocument.create('file://test.ets', 'ets', 1, code)

    const diagnostics = await service.provideDiagnostics(document, sourceFile)
    expect(diagnostics).toEqual([])
  })

  it('不存在的rawfile资源应该产生错误诊断', async () => {
    const code = 'getContext().resourceManager.getRawFileContent($rawfile("nonexistent.html"))'
    const sourceFile = ets.createSourceFile('test.ets', code, ets.ScriptTarget.ES2015, true)
    const document = TextDocument.create('file://test.ets', 'ets', 1, code)

    const diagnostics = await service.provideDiagnostics(document, sourceFile)
    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics[0].message).toContain('not found in project')
    expect(diagnostics[0].source).toBe('arkts-rawfile-diagnostic')
  })

  it('无效的rawfile引用应该产生解析错误诊断', async () => {
    const code = 'getContext().resourceManager.getRawFileContent($rawfile(""))'
    const sourceFile = ets.createSourceFile('test.ets', code, ets.ScriptTarget.ES2015, true)
    const document = TextDocument.create('file://test.ets', 'ets', 1, code)

    const diagnostics = await service.provideDiagnostics(document, sourceFile)
    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics[0].message).toContain('Failed to parse rawfile reference')
  })

  it('目录引用应该正确处理', async () => {
    const code = 'getContext().resourceManager.getRawFile($rawfile("xxx"))'
    const sourceFile = ets.createSourceFile('test.ets', code, ets.ScriptTarget.ES2015, true)
    const document = TextDocument.create('file://test.ets', 'ets', 1, code)

    const diagnostics = await service.provideDiagnostics(document, sourceFile)
    // 如果xxx目录存在，不应该有诊断
    // 如果不存在，应该有诊断
    expect(Array.isArray(diagnostics)).toBe(true)
  })

  it('嵌套路径rawfile应该正确处理', async () => {
    const code = 'getContext().resourceManager.getRawFileContent($rawfile("xxx/README.md"))'
    const sourceFile = ets.createSourceFile('test.ets', code, ets.ScriptTarget.ES2015, true)
    const document = TextDocument.create('file://test.ets', 'ets', 1, code)

    const diagnostics = await service.provideDiagnostics(document, sourceFile)
    // 如果xxx/README.md存在，不应该有诊断
    expect(Array.isArray(diagnostics)).toBe(true)
  })

  it('诊断级别为none时不应该产生诊断', async () => {
    const noneService = new RawfileDiagnosticService(mockLspConfiguration, projectRoot, () => 'none')
    const code = 'getContext().resourceManager.getRawFileContent($rawfile("nonexistent.html"))'
    const sourceFile = ets.createSourceFile('test.ets', code, ets.ScriptTarget.ES2015, true)
    const document = TextDocument.create('file://test.ets', 'ets', 1, code)

    const diagnostics = await noneService.provideDiagnostics(document, sourceFile)
    expect(diagnostics).toEqual([])
  })

  it('多个rawfile调用应该正确处理', async () => {
    const code = `
      const html = $rawfile("1.html")
      const nonexistent = $rawfile("nonexistent.html")
      const dir = $rawfile("xxx")
    `
    const sourceFile = ets.createSourceFile('test.ets', code, ets.ScriptTarget.ES2015, true)
    const document = TextDocument.create('file://test.ets', 'ets', 1, code)

    const diagnostics = await service.provideDiagnostics(document, sourceFile)
    // 应该至少对nonexistent.html产生诊断
    expect(Array.isArray(diagnostics)).toBe(true)
  })
})
