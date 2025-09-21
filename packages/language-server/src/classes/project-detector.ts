import type { LanguageServerLogger } from '@arkts/shared'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 项目类型枚举
 */
export enum ProjectType {
  /** TypeScript项目 */
  TypeScript = 'typescript',
  /** ArkTS项目 */
  ArkTS = 'arkts',
  /** 未知项目类型 */
  Unknown = 'unknown',
}

/**
 * 项目检测结果
 */
export interface ProjectDetectionResult {
  /** 项目类型 */
  type: ProjectType
  /** 包管理器类型 */
  packageManagerType: 'npm' | 'ohpm'
  /** 项目根目录 */
  projectRoot: string
  /** 配置文件路径 */
  configFile?: string
  /** 是否存在oh_modules目录 */
  hasOhModules: boolean
  /** 是否存在node_modules目录 */
  hasNodeModules: boolean
}

/**
 * ArkTS项目类型检测器
 * 
 * 检测逻辑：
 * 1. 优先检查是否存在oh-package.json5文件
 * 2. 检查是否存在build-profile.json5文件
 * 3. 检查是否存在oh_modules目录
 * 4. 如果以上任一条件满足，则判定为ArkTS项目，包管理器为ohpm
 * 5. 否则检查是否存在package.json，判定为TypeScript项目，包管理器为npm
 */
export class ProjectDetector {
  constructor(private readonly logger: LanguageServerLogger) {}

  /**
   * 检测项目类型
   * @param projectRoot 项目根目录路径
   * @returns 项目检测结果
   */
  detectProject(projectRoot: string): ProjectDetectionResult {
    this.logger.getConsola().info(`开始检测项目类型: ${projectRoot}`)

    const result: ProjectDetectionResult = {
      type: ProjectType.Unknown,
      packageManagerType: 'npm',
      projectRoot,
      hasOhModules: false,
      hasNodeModules: false,
    }

    try {
      // 检查目录是否存在
      if (!projectRoot || typeof projectRoot !== 'string') {
        this.logger.getConsola().warn(`项目根目录为空或无效: ${projectRoot}`)
        return result
      }
      
      if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
        this.logger.getConsola().warn(`项目根目录不存在: ${projectRoot}`)
        return result
      }

      // 检查oh_modules和node_modules目录
      result.hasOhModules = this.directoryExists(path.join(projectRoot, 'oh_modules'))
      result.hasNodeModules = this.directoryExists(path.join(projectRoot, 'node_modules'))

      // 1. 检查oh-package.json5 (项目级别)
      const ohPackageJsonPath = path.join(projectRoot, 'oh-package.json5')
      if (this.fileExists(ohPackageJsonPath)) {
        this.logger.getConsola().info(`发现项目级别oh-package.json5: ${ohPackageJsonPath}`)
        result.type = ProjectType.ArkTS
        result.packageManagerType = 'ohpm'
        result.configFile = ohPackageJsonPath
        return result
      }

      // 2. 检查build-profile.json5
      const buildProfilePath = path.join(projectRoot, 'build-profile.json5')
      if (this.fileExists(buildProfilePath)) {
        this.logger.getConsola().info(`发现build-profile.json5: ${buildProfilePath}`)
        
        // 进一步检查modules目录中的oh-package.json5
        if (this.hasModuleOhPackages(projectRoot)) {
          result.type = ProjectType.ArkTS
          result.packageManagerType = 'ohpm'
          result.configFile = buildProfilePath
          return result
        }
      }

      // 3. 检查oh_modules目录
      if (result.hasOhModules) {
        this.logger.getConsola().info(`发现oh_modules目录，判定为ArkTS项目`)
        result.type = ProjectType.ArkTS
        result.packageManagerType = 'ohpm'
        return result
      }

      // 4. 检查package.json (TypeScript项目)
      const packageJsonPath = path.join(projectRoot, 'package.json')
      if (this.fileExists(packageJsonPath)) {
        this.logger.getConsola().info(`发现package.json: ${packageJsonPath}`)
        result.type = ProjectType.TypeScript
        result.packageManagerType = 'npm'
        result.configFile = packageJsonPath
        return result
      }

      this.logger.getConsola().warn(`无法确定项目类型: ${projectRoot}`)

    } catch (error) {
      this.logger.getConsola().error(`项目类型检测失败: ${error}`)
      // 返回默认结果，不要抛出异常
    }

    this.logger.getConsola().info(`项目类型检测结果:`, {
      type: result.type,
      packageManagerType: result.packageManagerType,
      hasOhModules: result.hasOhModules,
      hasNodeModules: result.hasNodeModules,
    })

    return result
  }

  /**
   * 检查modules目录中是否存在oh-package.json5
   */
  private hasModuleOhPackages(projectRoot: string): boolean {
    try {
      const buildProfilePath = path.join(projectRoot, 'build-profile.json5')
      if (!this.fileExists(buildProfilePath)) {
        return false
      }

      const buildProfileContent = fs.readFileSync(buildProfilePath, 'utf-8')
      let buildProfile: any
      
      try {
        // 使用简单的JSON解析，如果失败则返回false
        // JSON5 files are not standard JSON, but for basic cases this might work
        buildProfile = JSON.parse(buildProfileContent.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))
      } catch (jsonError) {
        this.logger.getConsola().debug(`JSON解析失败，可能是JSON5格式: ${jsonError}`)
        return false
      }

      if (!buildProfile?.modules || !Array.isArray(buildProfile.modules)) {
        return false
      }

      // 检查每个模块目录中的oh-package.json5
      for (const module of buildProfile.modules) {
        if (typeof module?.srcPath === 'string') {
          const modulePath = path.join(projectRoot, module.srcPath)
          const moduleOhPackagePath = path.join(modulePath, 'oh-package.json5')
          if (this.fileExists(moduleOhPackagePath)) {
            this.logger.getConsola().info(`发现模块级别oh-package.json5: ${moduleOhPackagePath}`)
            return true
          }
        }
      }
    } catch (error) {
      this.logger.getConsola().debug(`检查模块oh-package.json5时出错: ${error}`)
    }

    return false
  }

  /**
   * 检查文件是否存在
   */
  private fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile()
    } catch {
      return false
    }
  }

  /**
   * 检查目录是否存在
   */
  private directoryExists(dirPath: string): boolean {
    try {
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()
    } catch {
      return false
    }
  }

  /**
   * 根据项目类型获取推荐的包管理器类型
   */
  static getRecommendedPackageManagerType(projectType: ProjectType): 'npm' | 'ohpm' {
    switch (projectType) {
      case ProjectType.ArkTS:
        return 'ohpm'
      case ProjectType.TypeScript:
      default:
        return 'npm'
    }
  }
}