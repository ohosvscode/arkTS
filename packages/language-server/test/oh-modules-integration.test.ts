import path from 'path'
import { beforeEach, describe, expect, it } from 'vitest'
import { ProjectType, UnifiedProjectDetector } from '@arkts/shared'
import { LanguageServerConfigManager } from '../src/classes/config-manager'
import { logger } from '../src/logger'

describe('oh_modules项目检测和模块解析测试', () => {
  const testProjectRoot = path.resolve(process.cwd(), 'sample')
  let configManager: LanguageServerConfigManager

  beforeEach(() => {
    configManager = new LanguageServerConfigManager(logger)
  })

  it('应该能检测ArkTS项目类型', () => {
    const result = UnifiedProjectDetector.detectProject(testProjectRoot)
    
    // 根据sample项目的实际情况验证
    expect(result.projectRoot).toBe(testProjectRoot)
    expect(result.type).toBe(ProjectType.ArkTS)
    expect(result.packageManagerType).toBe('ohpm')
  })

  it('应该正确设置包管理器类型', () => {
    configManager.detectAndSetProjectType(testProjectRoot)
    
    const packageManagerType = configManager.getPackageManagerType()
    expect(packageManagerType).toBe('ohpm')
  })

  it('应该在getTsConfig中设置packageManagerType', () => {
    configManager.detectAndSetProjectType(testProjectRoot)
    
    const tsConfig = configManager.getTsConfig({})
    expect(tsConfig.packageManagerType).toBe('ohpm')
  })

  it('UnifiedProjectDetector.getRecommendedPackageManagerType应该返回正确值', () => {
    expect(UnifiedProjectDetector.getRecommendedPackageManagerType(ProjectType.ArkTS)).toBe('ohpm')
    expect(UnifiedProjectDetector.getRecommendedPackageManagerType(ProjectType.TypeScript)).toBe('npm')
    expect(UnifiedProjectDetector.getRecommendedPackageManagerType(ProjectType.Unknown)).toBe('npm')
  })
})