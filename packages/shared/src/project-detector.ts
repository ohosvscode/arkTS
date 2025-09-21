import * as path from 'path'
import * as fs from 'fs'

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
  /** 检测时间戳，用于缓存 */
  detectedAt: number
  /** 检测策略 */
  detectionStrategy?: string
  /** 实际工作目录（与projectRoot可能不同） */
  workingDirectory?: string
}

/**
 * 项目检测缓存
 */
const detectionCache = new Map<string, ProjectDetectionResult>()

/**
 * 统一的项目类型检测工具
 * 
 * 增强的检测策略：
 * 1. 当前目录检测：优先检查当前目录
 * 2. 向上查找：递归向上查找项目根目录
 * 3. 向下查找：在子目录中查找项目结构
 * 4. 智能匹配：基于多种文件和目录的综合判断
 */
export class UnifiedProjectDetector {
  private static readonly CACHE_TTL = 30000 // 30秒缓存
  private static readonly MAX_TRAVERSE_DEPTH = 10 // 最大遍历深度

  /**
   * 检测项目类型（增强版）
   * @param initialPath 初始路径（可以是任意目录）
   * @param useCache 是否使用缓存，默认true
   * @returns 项目检测结果
   */
  static detectProject(initialPath: string, useCache: boolean = true): ProjectDetectionResult {
    console.info(`[UnifiedProjectDetector] 开始增强检测: ${initialPath}`)
    
    // 检查缓存
    if (useCache) {
      const cached = detectionCache.get(initialPath)
      if (cached && (Date.now() - cached.detectedAt) < this.CACHE_TTL) {
        console.info(`[UnifiedProjectDetector] 使用缓存结果`)
        return cached
      }
    }
    
    // 多策略检测
    const strategies = [
      () => this.detectCurrentDirectory(initialPath),
      () => this.detectUpwardTraversal(initialPath),
      () => this.detectDownwardSearch(initialPath),
    ]

    for (const strategy of strategies) {
      const result = strategy()
      if (result && result.type !== ProjectType.Unknown) {
        console.info(`[UnifiedProjectDetector] 检测成功，策略: ${result.detectionStrategy}`)
        if (useCache) {
          this.cacheResult(result.projectRoot, result)
        }
        return result
      }
    }

    // 如果所有策略都失败，返回智能默认结果
    const defaultResult = this.createIntelligentDefaultResult(initialPath)
    console.warn(`[UnifiedProjectDetector] 所有检测策略失败: ${initialPath}`)
    return defaultResult
  }

  /**
   * 策略1：当前目录检测
   */
  private static detectCurrentDirectory(projectRoot: string): ProjectDetectionResult | null {
    return this.detectProjectInDirectory(projectRoot, 'current-directory')
  }

  /**
   * 策略2：向上遍历检测
   */
  private static detectUpwardTraversal(startPath: string): ProjectDetectionResult | null {
    let currentPath = path.resolve(startPath)
    let depth = 0

    console.info(`[UnifiedProjectDetector] 开始向上遍历: ${startPath}`)

    while (depth < this.MAX_TRAVERSE_DEPTH) {
      console.debug(`[UnifiedProjectDetector] 检查路径: ${currentPath} (深度: ${depth})`)
      
      const result = this.detectProjectInDirectory(currentPath, 'upward-traversal')
      if (result && result.type !== ProjectType.Unknown) {
        result.workingDirectory = startPath
        console.info(`[UnifiedProjectDetector] 向上找到项目: ${currentPath}`)
        return result
      }

      const parentPath = path.dirname(currentPath)
      if (parentPath === currentPath) {
        // 到达根目录
        console.debug(`[UnifiedProjectDetector] 到达根目录，停止向上查找`)
        break
      }
      
      currentPath = parentPath
      depth++
    }

    console.debug(`[UnifiedProjectDetector] 向上遍历完成，未找到项目`)
    return null
  }

  /**
   * 策略3：向下搜索检测
   */
  private static detectDownwardSearch(rootPath: string): ProjectDetectionResult | null {
    if (!this.directoryExists(rootPath)) {
      return null
    }

    console.info(`[UnifiedProjectDetector] 开始向下搜索: ${rootPath}`)

    try {
      const entries = fs.readdirSync(rootPath, { withFileTypes: true })
      
      // 搜索子目录中的项目
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'oh_modules') {
          const subPath = path.join(rootPath, entry.name)
          console.debug(`[UnifiedProjectDetector] 检查子目录: ${subPath}`)
          
          const result = this.detectProjectInDirectory(subPath, 'downward-search')
          if (result && result.type !== ProjectType.Unknown) {
            result.workingDirectory = rootPath
            console.info(`[UnifiedProjectDetector] 向下找到项目: ${subPath}`)
            return result
          }
        }
      }
    } catch (error) {
      console.debug(`[UnifiedProjectDetector] 向下搜索失败: ${error}`)
    }

    console.debug(`[UnifiedProjectDetector] 向下搜索完成，未找到项目`)
    return null
  }

  /**
   * 在指定目录中检测项目
   * @param projectRoot 检测的目录
   * @param strategy 检测策略名称
   * @returns 项目检测结果或null
   */
  private static detectProjectInDirectory(projectRoot: string, strategy: string): ProjectDetectionResult | null {
    const result: ProjectDetectionResult = {
      type: ProjectType.Unknown,
      packageManagerType: 'npm',
      projectRoot,
      hasOhModules: false,
      hasNodeModules: false,
      detectedAt: Date.now(),
      detectionStrategy: strategy,
      workingDirectory: projectRoot,
    }

    try {
      // 检查目录是否存在
      if (!projectRoot || typeof projectRoot !== 'string') {
        return null
      }
      
      if (!this.directoryExists(projectRoot)) {
        return null
      }

      // 检查oh_modules和node_modules目录
      result.hasOhModules = this.directoryExists(path.join(projectRoot, 'oh_modules'))
      result.hasNodeModules = this.directoryExists(path.join(projectRoot, 'node_modules'))

      console.debug(`[UnifiedProjectDetector] 목录检查结果 ${projectRoot}: hasOhModules=${result.hasOhModules}, hasNodeModules=${result.hasNodeModules}`)

      // 1. 检查oh-package.json5 (项目级别)
      const ohPackageJsonPath = path.join(projectRoot, 'oh-package.json5')
      if (this.fileExists(ohPackageJsonPath)) {
        console.info(`[UnifiedProjectDetector] 发现项目级别oh-package.json5: ${ohPackageJsonPath}`)
        result.type = ProjectType.ArkTS
        result.packageManagerType = 'ohpm'
        result.configFile = ohPackageJsonPath
        return result
      }

      // 2. 检查build-profile.json5
      const buildProfilePath = path.join(projectRoot, 'build-profile.json5')
      if (this.fileExists(buildProfilePath)) {
        console.info(`[UnifiedProjectDetector] 发现build-profile.json5: ${buildProfilePath}`)
        
        // 进一步检查modules目录中的oh-package.json5
        if (this.hasModuleOhPackages(projectRoot)) {
          result.type = ProjectType.ArkTS
          result.packageManagerType = 'ohpm'
          result.configFile = buildProfilePath
          return result
        }
      }

      // 3. 检查oh_modules目录 - 作为强项目类型指示器
      if (result.hasOhModules) {
        console.info(`[UnifiedProjectDetector] 发现oh_modules目录，判定为ArkTS项目`)
        result.type = ProjectType.ArkTS
        result.packageManagerType = 'ohpm'
        return result
      }

      // 4. 增强检测：检查是否为ArkTS子模块目录
      if (this.isArkTSSubModule(projectRoot)) {
        console.info(`[UnifiedProjectDetector] 检测到ArkTS子模块目录: ${projectRoot}`)
        result.type = ProjectType.ArkTS
        result.packageManagerType = 'ohpm'
        return result
      }

      // 5. 检查package.json (TypeScript项目)
      const packageJsonPath = path.join(projectRoot, 'package.json')
      if (this.fileExists(packageJsonPath)) {
        console.info(`[UnifiedProjectDetector] 发现package.json: ${packageJsonPath}`)
        result.type = ProjectType.TypeScript
        result.packageManagerType = 'npm'
        result.configFile = packageJsonPath
        return result
      }

    } catch (error) {
      console.error(`[UnifiedProjectDetector] 目录检测失败 ${projectRoot}: ${error}`)
      return null
    }

    // 未找到项目标识，返回null表示此目录不是项目根目录
    return null
  }

  /**
   * 检查modules目录中是否存在oh-package.json5
   */
  private static hasModuleOhPackages(projectRoot: string): boolean {
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
        console.debug(`[UnifiedProjectDetector] JSON解析失败，可能是JSON5格式: ${jsonError}`)
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
            console.info(`[UnifiedProjectDetector] 发现模块级别oh-package.json5: ${moduleOhPackagePath}`)
            return true
          }
        }
      }
    } catch (error) {
      console.debug(`[UnifiedProjectDetector] 检查模块oh-package.json5时出错: ${error}`)
    }

    return false
  }

  /**
   * 检查是否为ArkTS子模块目录
   * @param projectRoot 检测目录
   * @returns 是否为ArkTS子模块
   */
  private static isArkTSSubModule(projectRoot: string): boolean {
    try {
      // 检查当前目录是否有oh-package.json5（模块级别）
      const ohPackageJsonPath = path.join(projectRoot, 'oh-package.json5')
      if (this.fileExists(ohPackageJsonPath)) {
        console.info(`[UnifiedProjectDetector] 发现模块级别oh-package.json5: ${ohPackageJsonPath}`)
        return true
      }

      // 检查是否存在典型的ArkTS模块目录结构
      const srcMainPath = path.join(projectRoot, 'src', 'main')
      const etsPath = path.join(srcMainPath, 'ets')
      const resourcesPath = path.join(srcMainPath, 'resources')
      
      // 如果存在src/main/ets目录，很可能是ArkTS模块
      if (this.directoryExists(etsPath)) {
        console.info(`[UnifiedProjectDetector] 发现ArkTS模块目录结构: ${etsPath}`)
        
        // 进一步检查父目录是否有build-profile.json5
        const parentDir = path.dirname(projectRoot)
        const parentBuildProfile = path.join(parentDir, 'build-profile.json5')
        if (this.fileExists(parentBuildProfile)) {
          console.info(`[UnifiedProjectDetector] 父目录存在build-profile.json5: ${parentBuildProfile}`)
          return true
        }
        
        // 检查更上层目录（可能是多层嵌套）
        const grandParentDir = path.dirname(parentDir)
        const grandParentBuildProfile = path.join(grandParentDir, 'build-profile.json5')
        if (this.fileExists(grandParentBuildProfile)) {
          console.info(`[UnifiedProjectDetector] 祖父目录存在build-profile.json5: ${grandParentBuildProfile}`)
          return true
        }
      }

      // 检查是否在oh_modules附近（可能在ArkTS项目内部）
      let currentPath = projectRoot
      let depth = 0
      const maxDepth = 5
      
      while (depth < maxDepth) {
        const ohModulesPath = path.join(currentPath, 'oh_modules')
        const buildProfilePath = path.join(currentPath, 'build-profile.json5')
        
        if (this.directoryExists(ohModulesPath) || this.fileExists(buildProfilePath)) {
          console.info(`[UnifiedProjectDetector] 在层级${depth}发现ArkTS项目标识: ${currentPath}`)
          return true
        }
        
        const parentPath = path.dirname(currentPath)
        if (parentPath === currentPath) {
          break // 到达根目录
        }
        
        currentPath = parentPath
        depth++
      }
      
    } catch (error) {
      console.debug(`[UnifiedProjectDetector] ArkTS子模块检测失败: ${error}`)
    }

    return false
  }

  /**
   * 创建智能默认结果，基于目录中的线索进行推断
   * @param initialPath 初始路径
   * @returns 智能推断的项目检测结果
   */
  private static createIntelligentDefaultResult(initialPath: string): ProjectDetectionResult {
    const result: ProjectDetectionResult = {
      type: ProjectType.Unknown,
      packageManagerType: 'npm', // 默认值
      projectRoot: initialPath,
      hasOhModules: false,
      hasNodeModules: false,
      detectedAt: Date.now(),
      detectionStrategy: 'intelligent-fallback',
      workingDirectory: initialPath,
    }

    try {
      // 搜索路径中的oh_modules线索
      let currentPath = initialPath
      let depth = 0
      const maxDepth = 8 // 增加搜索深度
      
      while (depth < maxDepth) {
        // 检查当前目录和子目录中的oh_modules
        const ohModulesPath = path.join(currentPath, 'oh_modules')
        if (this.directoryExists(ohModulesPath)) {
          console.info(`[UnifiedProjectDetector] 智能回退：发现oh_modules目录 ${ohModulesPath}`)
          result.hasOhModules = true
          result.packageManagerType = 'ohpm'
          result.type = ProjectType.ArkTS
          result.projectRoot = currentPath
          return result
        }
        
        // 检查子目录中的oh_modules
        try {
          const entries = fs.readdirSync(currentPath, { withFileTypes: true })
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const subOhModules = path.join(currentPath, entry.name, 'oh_modules')
              if (this.directoryExists(subOhModules)) {
                console.info(`[UnifiedProjectDetector] 智能回退：子目录中发现oh_modules ${subOhModules}`)
                result.hasOhModules = true
                result.packageManagerType = 'ohpm'
                result.type = ProjectType.ArkTS
                result.projectRoot = currentPath
                return result
              }
            }
          }
        } catch (error) {
          // 忽略读取错误，继续向上查找
        }
        
        // 向上查找
        const parentPath = path.dirname(currentPath)
        if (parentPath === currentPath) {
          break // 到达根目录
        }
        
        currentPath = parentPath
        depth++
      }
      
      // 检查node_modules目录
      const nodeModulesPath = path.join(initialPath, 'node_modules')
      if (this.directoryExists(nodeModulesPath)) {
        result.hasNodeModules = true
      }
      
    } catch (error) {
      console.debug(`[UnifiedProjectDetector] 智能回退检测失败: ${error}`)
    }
    
    console.info(`[UnifiedProjectDetector] 智能回退结果: ${result.packageManagerType}, hasOhModules: ${result.hasOhModules}`)
    return result
  }

  /**
   * 检查文件是否存在
   */
  private static fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile()
    } catch {
      return false
    }
  }

  /**
   * 检查目录是否存在
   */
  private static directoryExists(dirPath: string): boolean {
    try {
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()
    } catch {
      return false
    }
  }

  /**
   * 检查路径是否为目录
   */
  private static isDirectory(dirPath: string): boolean {
    try {
      return fs.statSync(dirPath).isDirectory()
    } catch {
      return false
    }
  }

  /**
   * 缓存检测结果
   */
  private static cacheResult(projectRoot: string, result: ProjectDetectionResult): void {
    detectionCache.set(projectRoot, result)
  }

  /**
   * 清除缓存
   */
  static clearCache(projectRoot?: string): void {
    if (projectRoot) {
      detectionCache.delete(projectRoot)
    } else {
      detectionCache.clear()
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

  /**
   * 快速检测项目类型（仅返回包管理器类型）
   */
  static detectPackageManagerType(projectRoot: string): 'npm' | 'ohpm' {
    const result = this.detectProject(projectRoot)
    return result.packageManagerType
  }

  /**
   * 获取项目的真实根目录
   * @param workingDirectory 当前工作目录
   * @returns 项目根目录路径
   */
  static getProjectRoot(workingDirectory: string): string {
    const result = this.detectProject(workingDirectory)
    return result.projectRoot
  }

  /**
   * 检查是否为ArkTS项目
   * @param projectPath 项目路径
   * @returns 是否为ArkTS项目
   */
  static isArkTSProject(projectPath: string): boolean {
    const result = this.detectProject(projectPath)
    return result.type === ProjectType.ArkTS
  }

  /**
   * 检查是否为TypeScript项目
   * @param projectPath 项目路径
   * @returns 是否为TypeScript项目
   */
  static isTypeScriptProject(projectPath: string): boolean {
    const result = this.detectProject(projectPath)
    return result.type === ProjectType.TypeScript
  }
}