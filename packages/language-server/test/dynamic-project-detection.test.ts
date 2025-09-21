import { describe, expect, it, beforeEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import { LanguageServerConfigManager } from '../src/classes/config-manager'
import { logger } from '../src/logger'

describe('动态项目识别功能测试', () => {
  let mockLspConfiguration: LanguageServerConfigManager

  beforeEach(() => {
    mockLspConfiguration = new LanguageServerConfigManager(logger)
  })

  /**
   * 模拟从文档路径提取项目根目录的逻辑
   */
  function extractProjectRootFromDocument(documentPath: string): string | undefined {
    try {
      let currentDir = path.dirname(documentPath)
      const maxLevels = 10 // 最多向上查找10级目录，避免无限循环
      
      for (let i = 0; i < maxLevels; i++) {
        // 检查ArkTS项目标识文件
        const ohPackageJson = path.join(currentDir, 'oh-package.json5')
        const packageJson = path.join(currentDir, 'package.json')
        
        if (fs.existsSync(ohPackageJson)) {
          return currentDir
        }
        
        if (fs.existsSync(packageJson)) {
          return currentDir
        }
        
        // 向上一级目录继续查找
        const parentDir = path.dirname(currentDir)
        if (parentDir === currentDir) {
          // 已到达根目录，停止查找
          break
        }
        currentDir = parentDir
      }
      
      return undefined
    } catch (error) {
      return undefined
    }
  }

  /**
   * 检查是否需要重新检测项目类型
   */
  function checkIfProjectRedetectionNeeded(
    documentPath: string,
    currentProjectRoot: string | undefined,
    lspConfig: LanguageServerConfigManager,
  ): { needed: boolean; reason?: string; newProjectRoot?: string } {
    try {
      // 1. 如果是第一次打开文档，需要检测
      if (!currentProjectRoot) {
        return {
          needed: true,
          reason: '首次文档打开，需要检测项目类型',
          newProjectRoot: extractProjectRootFromDocument(documentPath),
        }
      }
      
      // 2. 检查文档是否在当前项目根目录范围内
      const normalizedDocPath = path.normalize(documentPath)
      const normalizedCurrentRoot = path.normalize(currentProjectRoot)
      
      if (!normalizedDocPath.startsWith(normalizedCurrentRoot)) {
        // 文档在当前项目根目录之外，寻找新的项目根目录
        const newProjectRoot = extractProjectRootFromDocument(documentPath)
        if (newProjectRoot && newProjectRoot !== currentProjectRoot) {
          return {
            needed: true,
            reason: '文档位于当前项目范围外，检测到新项目根目录',
            newProjectRoot,
          }
        }
      }
      
      // 3. 检查是否是不同类型的项目（例如：从npm项目切换到ohpm项目）
      const detectedProjectRoot = extractProjectRootFromDocument(documentPath)
      if (detectedProjectRoot && detectedProjectRoot !== currentProjectRoot) {
        try {
          const tempDetection = lspConfig.detectAndSetProjectType(detectedProjectRoot)
          const currentDetection = lspConfig.getCurrentProjectDetection()
          
          if (currentDetection && 
              (tempDetection.packageManagerType !== currentDetection.packageManagerType || 
               tempDetection.type !== currentDetection.type)) {
            return {
              needed: true,
              reason: `检测到不同类型的项目 (${tempDetection.type}/${tempDetection.packageManagerType} vs ${currentDetection.type}/${currentDetection.packageManagerType})`,
              newProjectRoot: detectedProjectRoot,
            }
          }
        } catch {
          // 忽略检测错误
        }
      }
      
      return { needed: false }
    } catch (error) {
      return { needed: false }
    }
  }

  it('应该从文档路径正确提取项目根目录', () => {
    const testCases = [
      {
        documentPath: path.resolve(__dirname, '../../../sample/entry/src/main/ets/pages/Index.ets'),
        expectedRoot: path.resolve(__dirname, '../../../sample/entry') // entry目录下有自己的oh-package.json5
      },
      {
        documentPath: path.resolve(__dirname, '../../../sample/nested-modules/ohpm-submodule/src/main/ets/pages/Index.ets'),
        expectedRoot: path.resolve(__dirname, '../../../sample/nested-modules/ohpm-submodule')
      }
    ]

    testCases.forEach(({ documentPath, expectedRoot }) => {
      const result = extractProjectRootFromDocument(documentPath)
      if (fs.existsSync(documentPath)) {
        expect(result).toBeDefined()
        expect(path.normalize(result!)).toBe(path.normalize(expectedRoot))
      }
    })
  })

  it('应该正确检测首次文档打开的情况', () => {
    const documentPath = path.resolve(__dirname, '../../../sample/entry/src/main/ets/pages/Index.ets')
    const result = checkIfProjectRedetectionNeeded(documentPath, undefined, mockLspConfiguration)
    
    expect(result.needed).toBe(true)
    expect(result.reason).toContain('首次文档打开')
    expect(result.newProjectRoot).toBeDefined()
  })

  it('应该检测文档位于项目范围外的情况', () => {
    const currentProjectRoot = path.resolve(__dirname, '../../../sample/entry') // 以entry作为当前项目根目录
    const documentPath = path.resolve(__dirname, '../../../sample/nested-modules/ohpm-submodule/src/main/ets/pages/Index.ets')
    
    const result = checkIfProjectRedetectionNeeded(documentPath, currentProjectRoot, mockLspConfiguration)
    
    if (fs.existsSync(documentPath)) {
      expect(result.needed).toBe(true)
      expect(result.reason).toContain('文档位于当前项目范围外')
      expect(result.newProjectRoot).toBeDefined()
      expect(path.normalize(result.newProjectRoot!)).toBe(
        path.normalize(path.resolve(__dirname, '../../../sample/nested-modules/ohpm-submodule'))
      )
    }
  })

  it('应该检测同一项目内文档的情况', () => {
    const currentProjectRoot = path.resolve(__dirname, '../../../sample')
    const documentPath = path.resolve(__dirname, '../../../sample/entry/src/main/ets/pages/Index.ets')
    
    const result = checkIfProjectRedetectionNeeded(documentPath, currentProjectRoot, mockLspConfiguration)
    
    expect(result.needed).toBe(false)
  })

  it('应该处理无效路径的情况', () => {
    const invalidPath = '/nonexistent/path/to/file.ets'
    const result = extractProjectRootFromDocument(invalidPath)
    
    expect(result).toBeUndefined()
  })
})