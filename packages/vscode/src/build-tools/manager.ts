import type { ToolsEnvironment } from './types'
import * as vscode from 'vscode'
import { ToolsDetector } from './detector'
import { EnvironmentManager } from './environment'
import { ConfigurationResolver } from './resolver'

/**
 * 构建工具管理器
 * 统一管理构建工具的检测、配置和环境设置
 */
export class BuildToolsManager implements vscode.Disposable {
  private detector: ToolsDetector
  private environmentManager: EnvironmentManager
  private configResolver: ConfigurationResolver
  private statusBarItem?: vscode.StatusBarItem
  private disposables: vscode.Disposable[] = []

  constructor(context: vscode.ExtensionContext) {
    this.detector = new ToolsDetector()
    this.environmentManager = new EnvironmentManager(context)
    this.configResolver = new ConfigurationResolver()

    this.setupStatusBar()
    this.registerCommands()
    this.watchConfiguration()
  }

  /**
   * 获取环境管理器实例
   */
  getEnvironmentManager(): EnvironmentManager {
    return this.environmentManager
  }

  /**
   * 获取检测器实例
   */
  getDetector(): ToolsDetector {
    return this.detector
  }

  /**
   * 获取配置解析器实例
   */
  getConfigResolver(): ConfigurationResolver {
    return this.configResolver
  }

  /**
   * 初始化构建工具系统
   */
  async initialize(): Promise<void> {
    try {
      // 检查是否需要迁移遗留配置
      if (this.configResolver.needsLegacyMigration()) {
        await this.configResolver.migrateLegacyConfig()
        vscode.window.showInformationMessage('已迁移遗留的构建工具配置')
      }

      const config = this.configResolver.getBuildToolsConfig()

      if (config.autoDetect) {
        await this.autoDetectAndConfigure()
      }
      else if (config.path) {
        if (['auto', 'command-line-tools', 'deveco-studio'].includes(config.installationType)) {
          await this.configureFromUserPath(config.path, config.installationType as 'auto' | 'command-line-tools' | 'deveco-studio')
        }
      }

      this.updateStatusBar()
    }
    catch (error) {
      console.error('构建工具初始化失败:', error)
      this.showErrorMessage('构建工具初始化失败', error)
    }
  }

  /**
   * 自动检测并配置构建工具
   */
  async autoDetectAndConfigure(): Promise<void> {
    try {
      const result = await this.detector.detectAllEnvironments()

      if (result.environments.length === 0) {
        this.showNoToolsFoundMessage()
        return
      }

      if (result.recommended) {
        await this.applyEnvironment(result.recommended)
        await this.configResolver.applyDetectedEnvironment(result.recommended)
      }
      else if (result.environments.length > 1) {
        await this.showEnvironmentSelector(result.environments)
      }
      else {
        await this.applyEnvironment(result.environments[0])
        await this.configResolver.applyDetectedEnvironment(result.environments[0])
      }
    }
    catch (error) {
      console.error('自动检测失败:', error)
      this.showErrorMessage('自动检测构建工具失败', error)
    }
  }

  /**
   * 从用户指定路径配置
   */
  async configureFromUserPath(userPath: string, installationType: 'auto' | 'command-line-tools' | 'deveco-studio'): Promise<void> {
    try {
      // 验证路径
      const environment = await this.validateUserPath(userPath, installationType)
      if (environment) {
        await this.applyEnvironment(environment)
      }
      else {
        vscode.window.showErrorMessage(`无效的构建工具路径: ${userPath}`)
      }
    }
    catch (error) {
      console.error('用户路径配置失败:', error)
      this.showErrorMessage('配置用户指定的构建工具路径失败', error)
    }
  }

  /**
   * 应用环境配置
   */
  private async applyEnvironment(environment: ToolsEnvironment): Promise<void> {
    const config = this.configResolver.getBuildToolsConfig()

    if (config.manageEnvironment) {
      await this.environmentManager.applyEnvironment(environment)
    }

    // 触发语言服务器重启等其他操作
    await this.onEnvironmentChanged(environment)
  }

  /**
   * 验证用户路径
   */
  private async validateUserPath(userPath: string, installationType: 'auto' | 'command-line-tools' | 'deveco-studio'): Promise<ToolsEnvironment | null> {
    // 根据安装类型验证路径
    if (installationType === 'deveco-studio' || installationType === 'auto') {
      const toolsPath = `${userPath}/tool`
      if (await this.detector.validateDevEcoStudioStructure(toolsPath)) {
        return {
          type: 'deveco-studio',
          path: userPath,
          toolsPath,
          source: 'user-config',
        }
      }
    }

    if (installationType === 'command-line-tools' || installationType === 'auto') {
      if (await this.detector.validateCommandLineToolsStructure(userPath)) {
        return {
          type: 'command-line-tools',
          path: userPath,
          toolsPath: userPath,
          source: 'user-config',
        }
      }
    }

    return null
  }

  /**
   * 显示环境选择器
   */
  private async showEnvironmentSelector(environments: ToolsEnvironment[]): Promise<void> {
    const items = environments.map(env => ({
      label: `${env.type === 'deveco-studio' ? 'DevEco Studio' : 'Command-line-tools'}`,
      description: env.path,
      detail: `检测来源: ${env.source}, 可用工具: ${env.availableTools?.join(', ') || '未知'}`,
      environment: env,
    }))

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '检测到多个构建工具安装，请选择一个',
      ignoreFocusOut: true,
    })

    if (selected) {
      await this.applyEnvironment(selected.environment)
      await this.configResolver.applyDetectedEnvironment(selected.environment)
    }
  }

  /**
   * 设置状态栏
   */
  private setupStatusBar(): void {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    )
    this.statusBarItem.command = 'ets.buildTools.status'
    this.statusBarItem.tooltip = '点击查看构建工具状态'
    this.statusBarItem.show()

    this.disposables.push(this.statusBarItem)
  }

  /**
   * 更新状态栏
   */
  private updateStatusBar(): void {
    if (!this.statusBarItem)
      return

    const currentConfig = this.environmentManager.getCurrentConfig()
    if (currentConfig?.appliedEnvironment) {
      const env = currentConfig.appliedEnvironment
      const displayName = env.type === 'deveco-studio' ? 'DevEco Studio' : 'CLI Tools'
      this.statusBarItem.text = `$(tools) ${displayName}`
      this.statusBarItem.backgroundColor = undefined
    }
    else {
      this.statusBarItem.text = '$(warning) 未配置构建工具'
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground')
    }
  }

  /**
   * 注册命令
   */
  private registerCommands(): void {
    const commands = [
      vscode.commands.registerCommand('ets.buildTools.detect', () => this.commandDetectTools()),
      vscode.commands.registerCommand('ets.buildTools.configure', () => this.commandConfigureTools()),
      vscode.commands.registerCommand('ets.buildTools.status', () => this.commandShowStatus()),
      vscode.commands.registerCommand('ets.buildTools.reset', () => this.commandResetConfiguration()),
      vscode.commands.registerCommand('ets.buildTools.refresh', () => this.commandRefreshEnvironment()),
    ]

    this.disposables.push(...commands)
  }

  /**
   * 监听配置变化
   */
  private watchConfiguration(): void {
    const configWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('ets.buildTools')) {
        this.onConfigurationChanged()
      }
    })

    this.disposables.push(configWatcher)
  }

  /**
   * 配置变化处理
   */
  private async onConfigurationChanged(): Promise<void> {
    // 重新初始化
    await this.initialize()
  }

  /**
   * 环境变化处理
   */
  private async onEnvironmentChanged(_environment: ToolsEnvironment): Promise<void> {
    this.updateStatusBar()

    // 可以在这里触发语言服务器重启等操作
    // await vscode.commands.executeCommand('ets.restartServer')
  }

  // 命令处理方法
  private async commandDetectTools(): Promise<void> {
    await this.autoDetectAndConfigure()
  }

  private async commandConfigureTools(): Promise<void> {
    const action = await vscode.window.showQuickPick([
      { label: '自动检测', description: '自动检测系统中的构建工具' },
      { label: '手动选择路径', description: '手动指定构建工具安装路径' },
      { label: '重置配置', description: '重置所有构建工具配置' },
    ], {
      placeHolder: '选择配置方式',
    })

    if (!action)
      return

    switch (action.label) {
      case '自动检测':
        await this.configResolver.saveBuildToolsConfig({ autoDetect: true })
        await this.autoDetectAndConfigure()
        break
      case '手动选择路径':
        await this.promptForManualPath()
        break
      case '重置配置':
        await this.configResolver.resetToDefaults()
        await this.initialize()
        break
    }
  }

  private async commandShowStatus(): Promise<void> {
    const status = this.configResolver.getConfigurationStatus()
    const currentEnv = this.environmentManager.getCurrentConfig()

    const info = [
      `自动检测: ${status.autoDetectEnabled ? '启用' : '禁用'}`,
      `安装类型: ${status.config.installationType}`,
      `有效路径: ${status.effectivePath || '未设置'}`,
      `环境管理: ${status.config.manageEnvironment ? '启用' : '禁用'}`,
      `当前环境: ${currentEnv?.appliedEnvironment?.type || '未配置'}`,
    ].join('\n')

    vscode.window.showInformationMessage(`构建工具状态:\n${info}`, { modal: true })
  }

  private async commandResetConfiguration(): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
      '确定要重置所有构建工具配置吗？',
      { modal: true },
      '重置',
    )

    if (confirm === '重置') {
      await this.configResolver.resetToDefaults()
      this.environmentManager.clearEnvironment()
      await this.initialize()
      vscode.window.showInformationMessage('构建工具配置已重置')
    }
  }

  private async commandRefreshEnvironment(): Promise<void> {
    await this.environmentManager.refreshEnvironment()
    vscode.window.showInformationMessage('构建工具环境已刷新')
  }

  private async promptForManualPath(): Promise<void> {
    const selectedPath = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: '选择构建工具目录',
    })

    if (selectedPath && selectedPath[0]) {
      const path = selectedPath[0].fsPath

      // 检测安装类型
      const environment = await this.validateUserPath(path, 'auto')
      if (environment) {
        await this.configResolver.saveBuildToolsConfig({
          autoDetect: false,
          installationType: environment.type,
          path,
        })
        await this.applyEnvironment(environment)
        vscode.window.showInformationMessage(`已配置 ${environment.type} 构建工具`)
      }
      else {
        vscode.window.showErrorMessage('选择的路径不是有效的构建工具安装目录')
      }
    }
  }

  private showNoToolsFoundMessage(): void {
    vscode.window.showWarningMessage(
      '未检测到 HarmonyOS 构建工具。请安装 DevEco Studio 或 command-line-tools。',
      '手动配置',
    ).then((action) => {
      if (action === '手动配置') {
        this.commandConfigureTools()
      }
    })
  }

  private showErrorMessage(message: string, error: unknown): void {
    const errorMsg = error instanceof Error ? error.message : String(error)
    vscode.window.showErrorMessage(`${message}: ${errorMsg}`)
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    this.disposables.forEach(d => d.dispose())
    this.environmentManager.dispose()
  }
}
