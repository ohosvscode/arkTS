import type { BuildToolsConfig, ToolsEnvironment } from './types'
import { ConfigUtil } from '../config'

/**
 * 配置解析器
 * 负责解析和管理构建工具配置，处理用户设置、自动检测和遗留配置迁移
 */
export class ConfigurationResolver {
  /**
   * 解析构建工具配置
   */
  getBuildToolsConfig(): BuildToolsConfig {
    return {
      autoDetect: ConfigUtil['ets.buildTools.autoDetect'] ?? true,
      installationType: ConfigUtil['ets.buildTools.installationType'] ?? 'auto',
      path: ConfigUtil['ets.buildTools.path'],
      sdkPath: ConfigUtil['ets.sdkPath'],
      hmsPath: ConfigUtil['ets.hmsPath'],
      hdcPath: ConfigUtil['ets.hdcPath'],
      environmentVariables: ConfigUtil['ets.buildTools.environmentVariables'],
      manageEnvironment: ConfigUtil['ets.buildTools.manageEnvironment'] ?? true,
      legacyMigrated: ConfigUtil['ets.buildTools.legacyMigrated'] ?? false,
    }
  }

  /**
   * 保存构建工具配置
   */
  async saveBuildToolsConfig(config: Partial<BuildToolsConfig>): Promise<void> {
    const updates: Array<Promise<void>> = []

    if (config.autoDetect !== undefined) {
      updates.push(ConfigUtil.$update('ets.buildTools.autoDetect', config.autoDetect))
    }

    if (config.installationType !== undefined) {
      updates.push(ConfigUtil.$update('ets.buildTools.installationType', config.installationType))
    }

    if (config.path !== undefined) {
      updates.push(ConfigUtil.$update('ets.buildTools.path', config.path))
    }

    if (config.environmentVariables !== undefined) {
      updates.push(ConfigUtil.$update('ets.buildTools.environmentVariables', config.environmentVariables))
    }

    if (config.manageEnvironment !== undefined) {
      updates.push(ConfigUtil.$update('ets.buildTools.manageEnvironment', config.manageEnvironment))
    }

    await Promise.all(updates)
  }

  /**
   * 应用检测到的环境到配置
   */
  async applyDetectedEnvironment(environment: ToolsEnvironment): Promise<void> {
    const config: Partial<BuildToolsConfig> = {
      installationType: environment.type,
      path: environment.path,
    }

    // 如果是 DevEco Studio 安装，同时更新 SDK 路径
    if (environment.type === 'deveco-studio') {
      const sdkPath = `${environment.path}/sdk/default/openharmony`
      const hmsPath = `${environment.path}/sdk/default/harmony`

      config.sdkPath = sdkPath
      config.hmsPath = hmsPath

      // 更新遗留配置项
      await Promise.all([
        ConfigUtil.$update('ets.sdkPath', sdkPath),
        ConfigUtil.$update('ets.hmsPath', hmsPath),
      ])
    }

    await this.saveBuildToolsConfig(config)
  }

  /**
   * 检查是否需要迁移遗留配置
   */
  needsLegacyMigration(): boolean {
    // 如果已经标记为迁移完成，则不需要再迁移
    if (ConfigUtil['ets.buildTools.legacyMigrated']) {
      return false
    }

    const hasNewConfig = !!ConfigUtil['ets.buildTools.path']
      || ConfigUtil['ets.buildTools.installationType'] !== 'auto'

    const hasLegacyConfig = !!ConfigUtil['ets.sdkPath']
      || !!ConfigUtil['ets.hmsPath']
      || !!ConfigUtil['ets.hdcPath']

    return !hasNewConfig && hasLegacyConfig
  }

  /**
   * 迁移遗留配置
   */
  async migrateLegacyConfig(): Promise<void> {
    const legacyConfig = this.getLegacyConfig()

    if (legacyConfig.sdkPath) {
      // 尝试从 SDK 路径推断安装类型和根路径
      const installationInfo = this.inferInstallationFromSdkPath(legacyConfig.sdkPath)

      if (installationInfo) {
        await this.saveBuildToolsConfig({
          installationType: installationInfo.type,
          path: installationInfo.rootPath,
          sdkPath: legacyConfig.sdkPath,
          hmsPath: legacyConfig.hmsPath,
          hdcPath: legacyConfig.hdcPath,
        })

        // 标记迁移完成，不再使用遗留配置
        await ConfigUtil.$update('ets.buildTools.legacyMigrated', true)
      }
    }
  }

  private getLegacyConfig(): {
    sdkPath: string
    hmsPath: string
    hdcPath: string
  } {
    return {
      sdkPath: ConfigUtil['ets.sdkPath'],
      hmsPath: ConfigUtil['ets.hmsPath'],
      hdcPath: ConfigUtil['ets.hdcPath'],
    }
  }

  /**
   * 从 SDK 路径推断安装信息
   */
  private inferInstallationFromSdkPath(sdkPath: string): { type: 'deveco-studio' | 'command-line-tools', rootPath: string } | null {
    // DevEco Studio: /path/to/deveco/sdk/default/openharmony -> /path/to/deveco
    if (sdkPath.includes('/sdk/default/openharmony')) {
      const rootPath = sdkPath.replace('/sdk/default/openharmony', '')
      return { type: 'deveco-studio', rootPath }
    }

    // 其他情况暂时无法准确推断
    return null
  }

  /**
   * 重置配置到默认值
   */
  async resetToDefaults(): Promise<void> {
    await Promise.all([
      ConfigUtil.$update('ets.buildTools.autoDetect', true),
      ConfigUtil.$update('ets.buildTools.installationType', 'auto'),
      ConfigUtil.$update('ets.buildTools.path', ''),
      ConfigUtil.$update('ets.buildTools.environmentVariables', {}),
      ConfigUtil.$update('ets.buildTools.manageEnvironment', true),
    ])
  }

  /**
   * 获取有效的构建工具路径
   * 优先级：用户配置 > 自动检测 > 遗留配置
   */
  getEffectiveBuildToolsPath(): string | undefined {
    const config = this.getBuildToolsConfig()

    // 用户明确配置的路径
    if (config.path) {
      return config.path
    }

    // 如果启用自动检测，返回 undefined 让检测器处理
    if (config.autoDetect) {
      return undefined
    }

    // 尝试从遗留配置推断
    if (config.sdkPath) {
      const inferredInfo = this.inferInstallationFromSdkPath(config.sdkPath)
      return inferredInfo?.rootPath
    }

    return undefined
  }

  /**
   * 检查配置是否完整
   */
  isConfigurationComplete(): boolean {
    const config = this.getBuildToolsConfig()

    if (config.autoDetect) {
      // 自动检测模式下，只要启用了自动检测就认为配置完整
      return true
    }

    // 手动配置模式下，需要明确的路径
    return !!config.path
  }

  /**
   * 获取配置状态诊断信息
   */
  getConfigurationStatus(): {
    config: BuildToolsConfig
    needsMigration: boolean
    isComplete: boolean
    effectivePath: string | undefined
    hasLegacyConfig: boolean
    autoDetectEnabled: boolean
  } {
    const config = this.getBuildToolsConfig()
    const needsMigration = this.needsLegacyMigration()
    const isComplete = this.isConfigurationComplete()

    return {
      config,
      needsMigration,
      isComplete,
      effectivePath: this.getEffectiveBuildToolsPath(),
      hasLegacyConfig: !!ConfigUtil['ets.sdkPath'] || !!ConfigUtil['ets.hmsPath'],
      autoDetectEnabled: config.autoDetect,
    }
  }
}
