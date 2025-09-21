import type { LanguageServerLogger } from '@arkts/shared'
import type { LanguageServerConfigManager } from '../classes/config-manager'
import path from 'node:path'
import fs from 'node:fs'

/**
 * 项目重新检测结果接口
 */
export interface ProjectRedetectionResult {
  needed: boolean
  reason?: string
  newProjectRoot?: string
}

/**
 * 项目检测服务
 * 负责动态项目识别和检测逻辑
 */
export class ProjectDetectionService {
  constructor(
    private logger: LanguageServerLogger,
    private lspConfig: LanguageServerConfigManager
  ) {}

  /**
   * 检查是否需要重新检测项目类型
   * @param documentPath 当前打开的文档路径
   * @param currentProjectRoot 当前项目根目录
   * @returns 是否需要重新检测以及相关信息
   */
  checkIfProjectRedetectionNeeded(
    documentPath: string,
    currentProjectRoot: string | undefined,
  ): ProjectRedetectionResult {
    try {
      // 1. 如果是第一次打开文档，需要检测
      if (!currentProjectRoot) {
        return {
          needed: true,
          reason: '首次文档打开，需要检测项目类型',
          newProjectRoot: this.extractProjectRootFromDocument(documentPath),
        }
      }
      
      // 2. 检查文档是否在当前项目根目录范围内
      const normalizedDocPath = path.normalize(documentPath)
      const normalizedCurrentRoot = path.normalize(currentProjectRoot)
      
      if (!normalizedDocPath.startsWith(normalizedCurrentRoot)) {
        // 文档在当前项目根目录之外，寻找新的项目根目录
        const newProjectRoot = this.extractProjectRootFromDocument(documentPath)
        if (newProjectRoot && newProjectRoot !== currentProjectRoot) {
          return {
            needed: true,
            reason: '文档位于当前项目范围外，检测到新项目根目录',
            newProjectRoot,
          }
        }
      }
      
      // 3. 检查是否是不同类型的项目（例如：从npm项目切换到ohpm项目）
      const detectedProjectRoot = this.extractProjectRootFromDocument(documentPath)
      if (detectedProjectRoot && detectedProjectRoot !== currentProjectRoot) {
        const tempDetection = this.lspConfig.detectAndSetProjectType(detectedProjectRoot)
        const currentDetection = this.lspConfig.getCurrentProjectDetection()
        
        if (currentDetection && 
            (tempDetection.packageManagerType !== currentDetection.packageManagerType || 
             tempDetection.type !== currentDetection.type)) {
          return {
            needed: true,
            reason: `检测到不同类型的项目 (${tempDetection.type}/${tempDetection.packageManagerType} vs ${currentDetection.type}/${currentDetection.packageManagerType})`,
            newProjectRoot: detectedProjectRoot,
          }
        }
      }
      
      return { needed: false }
    } catch (error) {
      this.logger.getConsola().warn('检查项目重新检测时发生错误:', error)
      return { needed: false }
    }
  }

  /**
   * 从文档路径提取项目根目录
   * @param documentPath 文档路径
   * @returns 项目根目录路径，如果未找到则返回undefined
   */
  extractProjectRootFromDocument(documentPath: string): string | undefined {
    try {
      let currentDir = path.dirname(documentPath)
      const maxLevels = 10 // 最多向上查找10级目录，避免无限循环
      
      for (let i = 0; i < maxLevels; i++) {
        // 检查ArkTS项目标识文件
        const ohPackageJson = path.join(currentDir, 'oh-package.json5')
        const packageJson = path.join(currentDir, 'package.json')
        
        if (fs.existsSync(ohPackageJson)) {
          this.logger.getConsola().debug(`找到ArkTS项目根目录: ${currentDir} (oh-package.json5)`)
          return currentDir
        }
        
        if (fs.existsSync(packageJson)) {
          this.logger.getConsola().debug(`找到Node.js项目根目录: ${currentDir} (package.json)`)
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
      
      this.logger.getConsola().debug(`未找到项目根目录，文档路径: ${documentPath}`)
      return undefined
    } catch (error) {
      this.logger.getConsola().warn('提取项目根目录时发生错误:', error)
      return undefined
    }
  }

  /**
   * 执行项目重新检测
   * @param newProjectRoot 新的项目根目录
   * @param currentProjectRoot 当前项目根目录
   * @returns 检测结果
   */
  performProjectRedetection(newProjectRoot: string, currentProjectRoot: string | undefined) {
    try {
      const newProjectDetection = this.lspConfig.detectAndSetProjectType(newProjectRoot)
      this.logger.getConsola().info('文档打开时项目重新检测完成:', {
        type: newProjectDetection.type,
        packageManagerType: newProjectDetection.packageManagerType,
        hasOhModules: newProjectDetection.hasOhModules,
        hasNodeModules: newProjectDetection.hasNodeModules,
        previousRoot: currentProjectRoot,
        newRoot: newProjectRoot,
      })
      return newProjectDetection
    } catch (error) {
      this.logger.getConsola().error('文档打开时项目重新检测失败:', error)
      throw error
    }
  }
}