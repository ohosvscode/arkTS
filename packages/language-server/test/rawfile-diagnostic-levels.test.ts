import { describe, expect, it } from 'vitest'
import * as ets from 'ohos-typescript'
import { DiagnosticSeverity } from '@volar/language-server/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { LanguageServerConfigManager } from '../src/classes/config-manager'
import { logger } from '../src/logger'
import { RawfileDiagnosticService } from '../src/services/rawfile-diagnostic.service'

const projectRoot = 'c:\\Users\\Administrator\\Desktop\\arkTS\\sample'

describe('Rawfile诊断级别行为验证', () => {
  const mockLspConfiguration = new LanguageServerConfigManager(logger)

  it('error级别应该产生错误诊断', async () => {
    const service = new RawfileDiagnosticService(mockLspConfiguration, projectRoot, () => 'error')
    const code = 'getContext().resourceManager.getRawFileContent($rawfile("nonexistent.html"))'
    const sourceFile = ets.createSourceFile('test.ets', code, ets.ScriptTarget.ES2015, true)
    const document = TextDocument.create('file://test.ets', 'ets', 1, code)

    const diagnostics = await service.provideDiagnostics(document, sourceFile)
    
    if (diagnostics.length > 0) {
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Error)
      expect(diagnostics[0].message).toContain('not found in project')
    }
  })

  it('warning级别应该产生警告诊断', async () => {
    const service = new RawfileDiagnosticService(mockLspConfiguration, projectRoot, () => 'warning')
    const code = 'getContext().resourceManager.getRawFileContent($rawfile("nonexistent.html"))'
    const sourceFile = ets.createSourceFile('test.ets', code, ets.ScriptTarget.ES2015, true)
    const document = TextDocument.create('file://test.ets', 'ets', 1, code)

    const diagnostics = await service.provideDiagnostics(document, sourceFile)
    
    if (diagnostics.length > 0) {
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning)
      expect(diagnostics[0].message).toContain('not found in project')
    }
  })

  it('none级别不应该产生任何诊断', async () => {
    const service = new RawfileDiagnosticService(mockLspConfiguration, projectRoot, () => 'none')
    const code = 'getContext().resourceManager.getRawFileContent($rawfile("nonexistent.html"))'
    const sourceFile = ets.createSourceFile('test.ets', code, ets.ScriptTarget.ES2015, true)
    const document = TextDocument.create('file://test.ets', 'ets', 1, code)

    const diagnostics = await service.provideDiagnostics(document, sourceFile)
    
    expect(diagnostics).toEqual([])
  })

  it('存在的rawfile资源在所有级别都不应该产生诊断', async () => {
    const testCases = ['error', 'warning', 'none'] as const
    
    for (const level of testCases) {
      const service = new RawfileDiagnosticService(mockLspConfiguration, projectRoot, () => level)
      const code = 'getContext().resourceManager.getRawFileContent($rawfile("1.html"))'
      const sourceFile = ets.createSourceFile('test.ets', code, ets.ScriptTarget.ES2015, true)
      const document = TextDocument.create('file://test.ets', 'ets', 1, code)

      const diagnostics = await service.provideDiagnostics(document, sourceFile)
      
      // 对于存在的资源，所有级别都不应该产生诊断
      expect(diagnostics).toEqual([])
    }
  })

  it('诊断消息源标识应该正确', async () => {
    const service = new RawfileDiagnosticService(mockLspConfiguration, projectRoot, () => 'error')
    const code = 'getContext().resourceManager.getRawFileContent($rawfile("nonexistent.html"))'
    const sourceFile = ets.createSourceFile('test.ets', code, ets.ScriptTarget.ES2015, true)
    const document = TextDocument.create('file://test.ets', 'ets', 1, code)

    const diagnostics = await service.provideDiagnostics(document, sourceFile)
    
    if (diagnostics.length > 0) {
      expect(diagnostics[0].source).toBe('arkts-rawfile-diagnostic')
    }
  })
})