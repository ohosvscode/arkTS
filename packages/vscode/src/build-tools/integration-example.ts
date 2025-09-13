import * as vscode from 'vscode'
import { BuildToolsManager } from './index'

/**
 * 构建工具集成示例
 * 展示如何在VS Code扩展中集成构建工具管理系统
 */

let buildToolsManager: BuildToolsManager | undefined

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    // 初始化构建工具管理器
    buildToolsManager = new BuildToolsManager(context)
    context.subscriptions.push(buildToolsManager)

    // 启动初始化过程
    await buildToolsManager.initialize()

    // 注册其他扩展功能...
    registerAdditionalCommands(context)

    console.warn('ArkTS扩展已激活，构建工具管理器已初始化')
  }
  catch (error) {
    console.error('扩展激活失败:', error)
    vscode.window.showErrorMessage(`ArkTS扩展激活失败: ${error}`)
  }
}

export function deactivate(): void {
  if (buildToolsManager) {
    buildToolsManager.dispose()
    buildToolsManager = undefined
  }
}

function registerAdditionalCommands(context: vscode.ExtensionContext): void {
  // 注册其他扩展命令
  const commands = [
    // 构建工具相关命令已经在 BuildToolsManager 中注册
    // 这里可以注册其他扩展功能的命令

    vscode.commands.registerCommand('ets.example.checkBuildTools', async () => {
      if (buildToolsManager) {
        // 获取构建工具状态
        const envConfig = buildToolsManager.getEnvironmentManager().getCurrentConfig()
        if (envConfig?.appliedEnvironment) {
          const env = envConfig.appliedEnvironment
          vscode.window.showInformationMessage(
            `当前构建工具: ${env.type} (${env.path})`,
          )
        }
        else {
          vscode.window.showWarningMessage('构建工具未配置')
        }
      }
    }),
  ]

  context.subscriptions.push(...commands)
}

/**
 * 获取当前的构建工具管理器实例
 * 其他模块可以通过此函数获取管理器实例
 */
export function getBuildToolsManager(): BuildToolsManager | undefined {
  return buildToolsManager
}

/**
 * 检查构建工具是否已配置
 */
export function isBuildToolsConfigured(): boolean {
  return buildToolsManager?.getEnvironmentManager().isConfigured() ?? false
}

/**
 * 获取当前构建工具类型
 */
export function getCurrentBuildToolsType(): 'deveco-studio' | 'command-line-tools' | undefined {
  const config = buildToolsManager?.getEnvironmentManager().getCurrentConfig()
  return config?.appliedEnvironment?.type === 'unknown' ? undefined : config?.appliedEnvironment?.type
}
