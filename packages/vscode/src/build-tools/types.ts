/**
 * 构建工具配置类型定义
 */

export type InstallationType = 'command-line-tools' | 'deveco-studio' | 'unknown'

export interface ToolsEnvironment {
  /** 安装类型 */
  type: InstallationType
  /** 安装根路径 */
  path: string
  /** 工具目录路径 */
  toolsPath: string
  /** 检测来源 */
  source: 'environment-variable' | 'path-scan' | 'common-location' | 'user-config' | 'sdk-path-inference'
  /** 版本信息 */
  version?: string
  /** 可用工具列表 */
  availableTools?: string[]
}

export interface DetectionResult {
  /** 检测到的环境列表 */
  environments: ToolsEnvironment[]
  /** 推荐使用的环境 */
  recommended?: ToolsEnvironment
  /** 检测错误 */
  errors?: string[]
}

export interface BuildToolsConfig {
  /** 是否启用自动检测 */
  autoDetect: boolean
  /** 强制指定的安装类型 */
  installationType: 'auto' | InstallationType
  /** 用户指定的构建工具路径 */
  path?: string
  /** SDK路径配置 */
  sdkPath?: string
  /** HMS SDK路径配置 */
  hmsPath?: string
  /** HDC工具路径 */
  hdcPath?: string
  /** 额外的环境变量 */
  environmentVariables?: Record<string, string>
  /** 是否启用环境变量管理 */
  manageEnvironment: boolean
  /** 是否已完成遗留配置迁移 */
  legacyMigrated?: boolean
}

export interface ToolValidation {
  /** 工具名称 */
  name: string
  /** 工具路径 */
  path: string
  /** 是否可用 */
  available: boolean
  /** 版本信息 */
  version?: string
  /** 错误信息 */
  error?: string
}

export interface EnvironmentConfig {
  /** PATH环境变量添加项 */
  pathAdditions: string[]
  /** 环境变量设置 */
  variables: Record<string, string>
  /** 应用的环境 */
  appliedEnvironment?: ToolsEnvironment
}
