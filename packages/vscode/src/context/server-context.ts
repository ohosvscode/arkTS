/* eslint-disable node/prefer-global/process */
import type { ETSPluginOptions, TypescriptLanguageFeatures } from '@arkts/shared'
import type { LabsInfo } from '@volar/vscode'
import type { LanguageClient, LanguageClientOptions } from '@volar/vscode/node'
import type { IOnActivate, Translator } from 'unioc/vscode'
import path from 'node:path'
import { executeCommand } from 'reactive-vscode'
import * as vscode from 'vscode'
import { AbstractWatcher } from '../abstract-watcher'

export abstract class LanguageServerContext extends AbstractWatcher implements IOnActivate {
  /** Start the language server. */
  abstract start(force: boolean, overrideClientOptions: LanguageClientOptions): Promise<[LabsInfo | undefined, LanguageClientOptions]>
  /** Stop the language server. */
  abstract stop(): Promise<void>
  /** Restart the language server. */
  abstract restart(): Promise<void>
  /** Get the current language client. */
  abstract getCurrentLanguageClient(): LanguageClient | undefined
  /** Current translator. */
  protected readonly translator: Translator

  private debounce<Fn extends (...args: any[]) => any>(func: Fn, delay: number): (...args: Parameters<Fn>) => void {
    let timer: ReturnType<typeof setTimeout> | undefined
    return function (...args) {
      clearTimeout(timer)
      timer = setTimeout(() => {
        // eslint-disable-next-line ts/ban-ts-comment
        // @ts-ignore
        func.apply(this, args)
      }, delay)
    }
  }

  protected errorToString(error: unknown): string {
    if (error instanceof Error || (error && typeof error === 'object' && 'message' in error)) return this.translator.t('sdk.error.languageServerError', `${error.message} ${'code' in error ? `[${error.code}]` : ''}`)
    return this.translator.t('sdk.error.languageServerError', typeof error === 'string' || typeof error === 'number' || typeof error === 'boolean' ? error : JSON.stringify(error))
  }

  protected async handleLanguageServerError(error: unknown): Promise<void> {
    this.getConsola().error(`ArkTS语言服务器启动失败! 捕获到错误:`)
    this.getConsola().error(error)
    console.error(error)
    const choiceSdkPath = this.translator.t('sdk.error.choiceSdkPathMasually')
    const downloadOrChoiceSdkPath = this.translator.t('sdk.error.downloadOrChoiceSdkPath')
    const helpLabel = this.translator.t('sdk.error.helpLabel')
    const detail = this.errorToString(error)

    // 循环显示对话框，直到用户选择操作
    let result: string | undefined
    do {
      result = await vscode.window.showWarningMessage(
        'ArkTS Language Server Warning',
        { modal: true, detail },
        choiceSdkPath,
        downloadOrChoiceSdkPath,
        helpLabel,
      )

      if (result === helpLabel) {
        // 打开帮助文档，但不关闭对话框
        const helpUrl = vscode.Uri.parse('https://arkcode.dev/arkts/install/#方法一-选择自带在-deveco-studio-中的-sdk-推荐')
        await vscode.env.openExternal(helpUrl)
        // 继续循环，重新显示对话框
        result = undefined
      }
    } while (result === undefined)

    if (result === choiceSdkPath) {
      const [sdkPath] = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: this.translator.t('sdk.error.choiceSdkPathMasually'),
      }) || []
      if (!sdkPath) {
        vscode.window.showErrorMessage(this.translator.t('sdk.error.validSdkPath'))
      }
      else {
        vscode.workspace.getConfiguration().update('ets.sdkPath', sdkPath.fsPath, vscode.ConfigurationTarget.Global)
      }
    }
    else if (result === downloadOrChoiceSdkPath) {
      executeCommand('ets.installSDK')
    }
  }

  /** Listen to all local.properties files in the workspace. */
  onActivate(): void {
    const debouncedOnLocalPropertiesChanged = this.debounce(this.onLocalPropertiesChanged.bind(this), 1000)
    this.vscodeWatcher.onDidChange(uri => debouncedOnLocalPropertiesChanged('change', uri))
    this.vscodeWatcher.onDidDelete(uri => debouncedOnLocalPropertiesChanged('unlink', uri))
    this.vscodeWatcher.onDidCreate(uri => debouncedOnLocalPropertiesChanged('create', uri))
  }

  private isFirstStart: boolean = true
  private async onLocalPropertiesChanged(event: string, uri: vscode.Uri): Promise<void> {
    if (this.isFirstStart) {
      this.isFirstStart = false
      return
    }
    const basename = path.basename(uri.fsPath)
    if (basename !== 'local.properties') return
    this.getConsola().warn(`${uri.fsPath} is ${event.toUpperCase()}, restarting ETS Language Server...`)
    this.restart()
  }

  /** Get the path of the Ohos SDK from `local.properties` file. */
  protected async getOhosSdkPathFromLocalProperties(): Promise<string | undefined> {
    try {
      const workspaceDir = this.getCurrentWorkspaceDir()
      if (!workspaceDir) return undefined
      const localPropPath = vscode.Uri.joinPath(workspaceDir, 'local.properties')
      const stat = await vscode.workspace.fs.stat(localPropPath)
      if (stat.type !== vscode.FileType.File) return

      const content = await vscode.workspace.fs.readFile(localPropPath)
      const lines = content.toString().split('\n')
      const sdkPath = lines.find(line => line.startsWith('sdk.dir'))
      return sdkPath?.split('=')?.[1]?.trim()
    }
    catch {}
  }

  public async getAnalyzedHmsSdkPath(): Promise<vscode.Uri | undefined> {
    const hmsSdkPath = vscode.workspace.getConfiguration('ets').get('hmsPath')
    if (!hmsSdkPath || typeof hmsSdkPath !== 'string') return undefined
    return vscode.Uri.file(hmsSdkPath)
  }

  /** Configure the volar typescript plugin by `ClientOptions`. */
  protected async configureTypeScriptPlugin(clientOptions: LanguageClientOptions): Promise<void> {
    const typescriptPluginConfig: ETSPluginOptions = {
      workspaceFolder: this.getCurrentWorkspaceDir()?.fsPath,
      lspOptions: clientOptions.initializationOptions,
    }
    process.env.__etsTypescriptPluginFeature = JSON.stringify(typescriptPluginConfig)
    const typescriptLanguageFeatures = vscode.extensions.getExtension<TypescriptLanguageFeatures>('vscode.typescript-language-features')
    if (typescriptLanguageFeatures?.isActive) {
      executeCommand('typescript.restartTsServer')
    }
    await typescriptLanguageFeatures?.activate()
    typescriptLanguageFeatures?.exports.getAPI?.(0)?.configurePlugin?.('ets-typescript-plugin', typescriptPluginConfig)
  }
}
