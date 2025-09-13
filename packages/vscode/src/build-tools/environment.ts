import type { EnvironmentConfig, ToolsEnvironment } from './types'
import * as path from 'node:path'
import * as vscode from 'vscode'

/**
 * 环境变量管理器
 * 负责配置和管理VS Code环境变量集合
 */
export class EnvironmentManager {
  private envCollection: vscode.EnvironmentVariableCollection
  private currentConfig?: EnvironmentConfig

  constructor(context: vscode.ExtensionContext) {
    this.envCollection = context.environmentVariableCollection
  }

  /**
   * 应用构建工具环境配置
   */
  async applyEnvironment(environment: ToolsEnvironment): Promise<void> {
    // 清除之前的配置
    this.clearEnvironment()

    const config = this.generateEnvironmentConfig(environment)
    await this.applyEnvironmentConfig(config)

    this.currentConfig = config

    // 显示配置成功通知
    vscode.window.showInformationMessage(
      `已配置 ${environment.type === 'deveco-studio' ? 'DevEco Studio' : 'Command-line-tools'} 构建环境`,
    )
  }

  /**
   * 清除环境变量配置
   */
  clearEnvironment(): void {
    this.envCollection.clear()
    this.currentConfig = undefined
  }

  /**
   * 获取当前环境配置
   */
  getCurrentConfig(): EnvironmentConfig | undefined {
    return this.currentConfig
  }

  /**
   * 检查环境是否已配置
   */
  isConfigured(): boolean {
    return this.currentConfig !== undefined
  }

  /**
   * 生成环境配置
   */
  private generateEnvironmentConfig(environment: ToolsEnvironment): EnvironmentConfig {
    const pathAdditions: string[] = []
    const variables: Record<string, string> = {}

    if (environment.type === 'deveco-studio') {
      // DevEco Studio 配置
      const devecoPath = environment.path
      const toolPath = environment.toolsPath

      // 1. DevEco Studio bin 路径
      const binPath = path.join(devecoPath, 'bin')
      pathAdditions.push(binPath)

      // 2. 各个工具路径
      const hvigorPath = path.join(toolPath, 'hvigor', 'bin')
      const ohpmPath = path.join(toolPath, 'ohpm', 'bin')
      const nodePath = path.join(toolPath, 'node', 'bin')

      pathAdditions.push(hvigorPath, ohpmPath, nodePath)

      // 3. 环境变量
      const sdkPath = path.join(devecoPath, 'sdk')
      variables.DEVECO_SDK_HOME = sdkPath
      variables['DevEco Studio'] = binPath

      // 4. SDK 相关路径
      const openHarmonySdkPath = path.join(sdkPath, 'default', 'openharmony')
      const harmonySdkPath = path.join(sdkPath, 'default', 'harmony')
      variables.OHOS_SDK_HOME = openHarmonySdkPath
      variables.HARMONY_SDK_HOME = harmonySdkPath
    }
    else if (environment.type === 'command-line-tools') {
      // Command-line-tools 配置
      const binPath = path.join(environment.toolsPath, 'bin')
      pathAdditions.push(binPath)

      // Node.js 路径 (如果存在)
      const nodePath = path.join(environment.toolsPath, 'tool', 'node', 'bin')
      pathAdditions.push(nodePath)

      // 工具特定的环境变量
      variables.COMMAND_LINE_TOOLS_HOME = environment.toolsPath
    }

    return {
      pathAdditions,
      variables,
      appliedEnvironment: environment,
    }
  }

  /**
   * 应用环境配置到VS Code
   */
  private async applyEnvironmentConfig(config: EnvironmentConfig): Promise<void> {
    // 配置 PATH
    if (config.pathAdditions.length > 0) {
      const pathAddition = config.pathAdditions.join(path.delimiter)
      this.envCollection.prepend('PATH', pathAddition + path.delimiter)
    }

    // 配置其他环境变量
    for (const [key, value] of Object.entries(config.variables)) {
      this.envCollection.replace(key, value)
    }

    // 设置集合描述
    const envType = config.appliedEnvironment?.type === 'deveco-studio'
      ? 'DevEco Studio'
      : 'HarmonyOS Command-line-tools'

    this.envCollection.description = `${envType} 构建工具环境变量`
  }

  /**
   * 获取环境变量详情（用于调试）
   */
  getEnvironmentDetails(): Record<string, string> {
    const details: Record<string, string> = {}

    this.envCollection.forEach((key, value) => {
      details[key] = `${value.type}: ${value.value}`
    })

    return details
  }

  /**
   * 验证环境配置
   */
  async validateEnvironment(): Promise<boolean> {
    if (!this.currentConfig?.appliedEnvironment) {
      return false
    }

    try {
      // 检查关键工具是否可访问
      const environment = this.currentConfig.appliedEnvironment

      if (environment.type === 'deveco-studio') {
        // 检查 hvigor 是否可用
        // const hvigorPath = path.join(environment.toolsPath, 'hvigor', 'bin', 'hvigor')
        // 这里可以添加更详细的验证逻辑
        return true
      }
      else if (environment.type === 'command-line-tools') {
        // 检查 hvigorw 是否可用
        // const hvigorwPath = path.join(environment.toolsPath, 'bin', 'hvigorw')
        // 这里可以添加更详细的验证逻辑
        return true
      }

      return false
    }
    catch (error) {
      console.error('环境验证失败:', error)
      return false
    }
  }

  /**
   * 刷新环境配置
   */
  async refreshEnvironment(): Promise<void> {
    if (this.currentConfig?.appliedEnvironment) {
      await this.applyEnvironment(this.currentConfig.appliedEnvironment)
    }
  }

  /**
   * 销毁环境管理器
   */
  dispose(): void {
    this.clearEnvironment()
  }
}
