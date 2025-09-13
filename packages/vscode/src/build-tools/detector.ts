import type { DetectionResult, InstallationType, ToolsEnvironment } from './types'

import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

const access = promisify(fs.access)

/**
 * 构建工具检测器
 * 负责自动检测各种HarmonyOS构建工具安装
 */
export class ToolsDetector {
  private static readonly REQUIRED_COMMAND_LINE_TOOLS = [
    'hvigorw',
    'ohpm',
    'codelinter',
    'hstack',
  ]

  private static readonly REQUIRED_DEVECO_TOOLS = [
    'hvigor',
    'ohpm',
    'hstack',
  ]

  /**
   * 检测所有可用的构建工具环境
   */
  async detectAllEnvironments(): Promise<DetectionResult> {
    const environments: ToolsEnvironment[] = []
    const errors: string[] = []

    try {
      // 1. DevEco Studio 环境变量检测 (最高优先级)
      const devecoEnvs = await this.detectFromDevEcoEnvironment()
      environments.push(...devecoEnvs)

      // 2. Command-line-tools 检测
      const commandLineEnvs = await this.detectCommandLineTools()
      environments.push(...commandLineEnvs)

      // 3. PATH 扫描检测
      const pathEnvs = await this.detectFromPath()
      environments.push(...pathEnvs)

      // 4. 常见安装路径扫描
      const commonLocationEnvs = await this.detectFromCommonLocations()
      environments.push(...commonLocationEnvs)

      // 去重并验证
      const uniqueEnvironments = this.deduplicateEnvironments(environments)
      const validatedEnvironments = await this.validateEnvironments(uniqueEnvironments)

      // 选择推荐环境
      const recommended = this.selectRecommendedEnvironment(validatedEnvironments)

      return {
        environments: validatedEnvironments,
        recommended,
        errors,
      }
    }
    catch (error) {
      errors.push(`检测失败: ${error instanceof Error ? error.message : String(error)}`)
      return { environments, errors }
    }
  }

  /**
   * 通过 DevEco Studio 环境变量检测
   */
  private async detectFromDevEcoEnvironment(): Promise<ToolsEnvironment[]> {
    const environments: ToolsEnvironment[] = []

    // DevEco Studio 环境变量检测
    const devecoStudioBin = process.env['DevEco Studio']
    if (devecoStudioBin && await this.pathExists(devecoStudioBin)) {
      // DevEco Studio/bin -> DevEco Studio (安装根目录)
      const devecoStudioRoot = path.dirname(devecoStudioBin)
      const toolsPath = path.join(devecoStudioRoot, 'tool')

      if (await this.validateDevEcoStudioStructure(toolsPath)) {
        environments.push({
          type: 'deveco-studio',
          path: devecoStudioRoot,
          toolsPath,
          source: 'environment-variable',
        })
      }
    }

    // DEVECO_SDK_HOME 推断
    const sdkHome = process.env.DEVECO_SDK_HOME
    if (sdkHome && await this.pathExists(sdkHome)) {
      // 尝试从 SDK 路径推断 DevEco Studio 安装路径
      const potentialDevecoRoot = path.dirname(sdkHome)
      const toolsPath = path.join(potentialDevecoRoot, 'tool')

      if (await this.validateDevEcoStudioStructure(toolsPath)) {
        // 避免重复添加相同路径
        if (!environments.some(env => env.path === potentialDevecoRoot)) {
          environments.push({
            type: 'deveco-studio',
            path: potentialDevecoRoot,
            toolsPath,
            source: 'sdk-path-inference',
          })
        }
      }
    }

    return environments
  }

  /**
   * 检测独立的 command-line-tools 安装
   */
  private async detectCommandLineTools(): Promise<ToolsEnvironment[]> {
    const environments: ToolsEnvironment[] = []

    // 从环境变量中查找可能的 command-line-tools 路径
    const pathEnv = process.env.PATH || ''
    const pathDirs = pathEnv.split(path.delimiter)

    for (const dir of pathDirs) {
      if (!dir || !await this.pathExists(dir))
        continue

      // 检查是否是 command-line-tools/bin 目录
      if (path.basename(dir) === 'bin') {
        const parentDir = path.dirname(dir)
        if (await this.validateCommandLineToolsStructure(parentDir)) {
          environments.push({
            type: 'command-line-tools',
            path: parentDir,
            toolsPath: parentDir,
            source: 'path-scan',
          })
        }
      }
    }

    return environments
  }

  /**
   * 从 PATH 环境变量检测工具
   */
  private async detectFromPath(): Promise<ToolsEnvironment[]> {
    const environments: ToolsEnvironment[] = []

    // 检查 PATH 中的 hvigorw 和其他工具
    const pathEnv = process.env.PATH || ''
    const pathDirs = pathEnv.split(path.delimiter)

    for (const dir of pathDirs) {
      if (!dir || !await this.pathExists(dir))
        continue

      const hvigorwPath = path.join(dir, process.platform === 'win32' ? 'hvigorw.bat' : 'hvigorw')
      if (await this.pathExists(hvigorwPath)) {
        // 尝试推断安装类型和根路径
        const rootPath = await this.inferRootPathFromBin(dir)
        if (rootPath) {
          const installationType = await this.determineInstallationType(rootPath)
          environments.push({
            type: installationType,
            path: rootPath,
            toolsPath: installationType === 'deveco-studio' ? path.join(rootPath, 'tool') : rootPath,
            source: 'path-scan',
          })
        }
      }
    }

    return environments
  }

  /**
   * 扫描常见安装位置
   */
  private async detectFromCommonLocations(): Promise<ToolsEnvironment[]> {
    const environments: ToolsEnvironment[] = []
    const commonPaths = this.getCommonInstallationPaths()

    for (const commonPath of commonPaths) {
      if (!await this.pathExists(commonPath))
        continue

      // 检查是否是 DevEco Studio 安装
      const devecoToolsPath = path.join(commonPath, 'tool')
      if (await this.validateDevEcoStudioStructure(devecoToolsPath)) {
        environments.push({
          type: 'deveco-studio',
          path: commonPath,
          toolsPath: devecoToolsPath,
          source: 'common-location',
        })
        continue
      }

      // 检查是否是 command-line-tools 安装
      if (await this.validateCommandLineToolsStructure(commonPath)) {
        environments.push({
          type: 'command-line-tools',
          path: commonPath,
          toolsPath: commonPath,
          source: 'common-location',
        })
      }
    }

    return environments
  }

  /**
   * 验证 DevEco Studio 安装结构
   */
  async validateDevEcoStudioStructure(toolsPath: string): Promise<boolean> {
    try {
      if (!await this.pathExists(toolsPath))
        return false

      // 检查必要的工具目录
      const requiredDirs = ['hvigor', 'ohpm', 'node']
      for (const dir of requiredDirs) {
        const dirPath = path.join(toolsPath, dir)
        if (!await this.pathExists(dirPath))
          return false
      }

      return true
    }
    catch {
      return false
    }
  }

  /**
   * 验证 command-line-tools 安装结构
   */
  async validateCommandLineToolsStructure(rootPath: string): Promise<boolean> {
    try {
      const binPath = path.join(rootPath, 'bin')
      if (!await this.pathExists(binPath))
        return false

      // 检查必要的工具
      const requiredTools = ToolsDetector.REQUIRED_COMMAND_LINE_TOOLS
      for (const tool of requiredTools) {
        const toolPath = path.join(binPath, process.platform === 'win32' ? `${tool}.bat` : tool)
        if (!await this.pathExists(toolPath))
          return false
      }

      return true
    }
    catch {
      return false
    }
  }

  /**
   * 验证环境可用性
   */
  private async validateEnvironments(environments: ToolsEnvironment[]): Promise<ToolsEnvironment[]> {
    const validatedEnvironments: ToolsEnvironment[] = []

    for (const env of environments) {
      const availableTools = await this.getAvailableTools(env)
      const version = await this.getToolsVersion(env)

      validatedEnvironments.push({
        ...env,
        availableTools,
        version,
      })
    }

    return validatedEnvironments
  }

  /**
   * 获取可用工具列表
   */
  private async getAvailableTools(env: ToolsEnvironment): Promise<string[]> {
    const tools: string[] = []

    if (env.type === 'deveco-studio') {
      for (const tool of ToolsDetector.REQUIRED_DEVECO_TOOLS) {
        const toolDir = path.join(env.toolsPath, tool)
        if (await this.pathExists(toolDir)) {
          tools.push(tool)
        }
      }
    }
    else if (env.type === 'command-line-tools') {
      const binPath = path.join(env.toolsPath, 'bin')
      for (const tool of ToolsDetector.REQUIRED_COMMAND_LINE_TOOLS) {
        const toolPath = path.join(binPath, process.platform === 'win32' ? `${tool}.bat` : tool)
        if (await this.pathExists(toolPath)) {
          tools.push(tool)
        }
      }
    }

    return tools
  }

  /**
   * 获取工具版本信息
   */
  private async getToolsVersion(env: ToolsEnvironment): Promise<string | undefined> {
    // 尝试从 hvigor 获取版本信息
    try {
      let hvigorPath: string

      if (env.type === 'deveco-studio') {
        hvigorPath = path.join(env.toolsPath, 'hvigor', 'bin', 'hvigor')
      }
      else {
        hvigorPath = path.join(env.toolsPath, 'bin', 'hvigorw')
      }

      if (await this.pathExists(hvigorPath)) {
        // 这里可以执行 hvigor --version 来获取版本，但为了简化暂时跳过
        return 'unknown'
      }
    }
    catch {
      // 忽略版本检测错误
    }

    return undefined
  }

  /**
   * 选择推荐的环境
   */
  private selectRecommendedEnvironment(environments: ToolsEnvironment[]): ToolsEnvironment | undefined {
    if (environments.length === 0)
      return undefined

    // 优先级：环境变量检测 > DevEco Studio > command-line-tools
    const priorityOrder: Array<ToolsEnvironment['source']> = [
      'environment-variable',
      'sdk-path-inference',
      'path-scan',
      'common-location',
    ]

    const typeOrder: InstallationType[] = ['deveco-studio', 'command-line-tools', 'unknown']

    for (const source of priorityOrder) {
      for (const type of typeOrder) {
        const env = environments.find(e => e.source === source && e.type === type)
        if (env)
          return env
      }
    }

    return environments[0]
  }

  /**
   * 去重环境列表
   */
  private deduplicateEnvironments(environments: ToolsEnvironment[]): ToolsEnvironment[] {
    const seen = new Set<string>()
    return environments.filter((env) => {
      const key = `${env.type}:${env.path}`
      if (seen.has(key))
        return false
      seen.add(key)
      return true
    })
  }

  /**
   * 从 bin 目录推断根路径
   */
  private async inferRootPathFromBin(binPath: string): Promise<string | undefined> {
    // 对于 command-line-tools: /path/to/command-line-tools/bin -> /path/to/command-line-tools
    if (path.basename(binPath) === 'bin') {
      return path.dirname(binPath)
    }

    // 对于 DevEco Studio: /path/to/deveco/tool/hvigor/bin -> /path/to/deveco
    const segments = binPath.split(path.sep)
    const toolIndex = segments.lastIndexOf('tool')
    if (toolIndex > 0) {
      return segments.slice(0, toolIndex).join(path.sep)
    }

    return undefined
  }

  /**
   * 确定安装类型
   */
  private async determineInstallationType(rootPath: string): Promise<InstallationType> {
    // 检查是否有 tool 目录 (DevEco Studio)
    const toolDir = path.join(rootPath, 'tool')
    if (await this.pathExists(toolDir)) {
      return 'deveco-studio'
    }

    // 检查是否有 bin 目录 (command-line-tools)
    const binDir = path.join(rootPath, 'bin')
    if (await this.pathExists(binDir)) {
      return 'command-line-tools'
    }

    return 'unknown'
  }

  /**
   * 获取常见安装路径
   */
  private getCommonInstallationPaths(): string[] {
    const paths: string[] = []
    const homeDir = process.env.HOME || process.env.USERPROFILE || ''

    if (process.platform === 'win32') {
      paths.push(
        'C:\\Program Files\\DevEco Studio',
        'C:\\DevEco Studio',
        path.join(homeDir, 'AppData', 'Local', 'DevEco Studio'),
        'C:\\command-line-tools',
        path.join(homeDir, 'command-line-tools'),
      )
    }
    else if (process.platform === 'darwin') {
      paths.push(
        '/Applications/DevEco Studio.app',
        path.join(homeDir, 'DevEco Studio'),
        path.join(homeDir, 'command-line-tools'),
        '/opt/command-line-tools',
      )
    }
    else {
      paths.push(
        path.join(homeDir, 'DevEco Studio'),
        path.join(homeDir, 'command-line-tools'),
        '/opt/DevEco Studio',
        '/opt/command-line-tools',
        '/usr/local/DevEco Studio',
        '/usr/local/command-line-tools',
      )
    }

    return paths
  }

  /**
   * 检查路径是否存在
   */
  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath)
      return true
    }
    catch {
      return false
    }
  }
}
