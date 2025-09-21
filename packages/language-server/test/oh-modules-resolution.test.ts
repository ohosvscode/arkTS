import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { LanguageServerConfigManager } from '../src/classes/config-manager'
import { logger } from '../src/logger'

describe('oh_modules模块解析功能测试', () => {
  const testProjectRoot = path.resolve(process.cwd(), 'sample')
  
  it('应该在TypeScript编译器选项中配置oh_modules路径', () => {
    const configManager = new LanguageServerConfigManager(logger)
    configManager.detectAndSetProjectType(testProjectRoot)
    
    // 模拟从SdkAnalyzer获取的完整配置，包含oh_modules路径
    configManager.setTypeRoots([
      path.join(testProjectRoot, 'node_modules', '@types'),
      path.join(testProjectRoot, 'oh_modules', '@types'),
    ])
    
    configManager.setPaths({
      '*': [
        path.join(testProjectRoot, 'oh_modules', '*'),
        path.join(testProjectRoot, 'node_modules', '*'),
      ],
    })
    
    const tsConfig = configManager.getTsConfig({})
    
    // 验证oh_modules相关的路径配置
    expect(tsConfig.packageManagerType).toBe('ohpm')
    
    // 检查typeRoots是否包含oh_modules/@types
    const typeRoots = tsConfig.typeRoots || []
    const hasOhModulesTypes = typeRoots.some((root: string) => 
      root.includes('oh_modules') && root.includes('@types')
    )
    expect(hasOhModulesTypes).toBe(true)
    
    // 检查paths是否包含oh_modules/*
    const paths = tsConfig.paths || {}
    const hasOhModulesPath = Object.entries(paths).some(([key, value]) => 
      key === '*' && Array.isArray(value) && value.some((p: string) => p.includes('oh_modules'))
    )
    expect(hasOhModulesPath).toBe(true)
  })
  
  it('应该能检测项目是否有oh_modules目录', () => {
    const sampleOhModulesPath = path.join(testProjectRoot, 'oh_modules')
    
    // 检查sample项目中是否存在oh_modules目录
    const hasOhModules = fs.existsSync(sampleOhModulesPath)
    console.log('Sample项目oh_modules目录存在:', hasOhModules)
    console.log('检查路径:', sampleOhModulesPath)
    
    // 如果oh_modules目录存在，验证配置
    if (hasOhModules) {
      const configManager = new LanguageServerConfigManager(logger)
      configManager.detectAndSetProjectType(testProjectRoot)
      
      const projectDetection = configManager.detectAndSetProjectType(testProjectRoot)
      expect(projectDetection.hasOhModules).toBe(true)
    }
  })
  
  it('应该正确处理ArkTS和TypeScript项目的差异', () => {
    const configManager = new LanguageServerConfigManager(logger)
    
    // 测试ArkTS项目
    const arktsDetection = configManager.detectAndSetProjectType(testProjectRoot)
    expect(arktsDetection.packageManagerType).toBe('ohpm')
    
    // 模拟TypeScript项目（使用当前工作目录，它有package.json但没有oh-package.json5）
    const tsDetection = configManager.detectAndSetProjectType(process.cwd())
    expect(tsDetection.packageManagerType).toBe('npm')
  })
})