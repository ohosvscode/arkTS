import type { SdkVersion } from '@arkts/sdk-downloader'
import os from 'node:os'
import { ExtensionLogger } from '@arkts/shared/vscode'
import { Autowired, Service } from 'unioc'
import { Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { AbstractWatcher } from '../abstract-watcher'
import { FileSystemContext } from '../context/file-system-context'
import { SdkAnalyzer } from './sdk-analyzer'
import { SdkVersionGuesser } from './sdk-guesser'

type IsInstalledVersion = keyof typeof SdkVersion extends `API${infer N}` ? N : never

@Service
export class SdkManager {
  @Autowired(Translator) public readonly translator: Translator
  @Autowired private readonly logger: ExtensionLogger
  @Autowired public readonly watcher: AbstractWatcher
  @Autowired private readonly fsx: FileSystemContext

  /**
   * Set the path to the OpenHarmony SDK.
   *
   * @param sdkFolderPath - The path to the OpenHarmony SDK.
   */
  async setOhosSdkPath(sdkFolderPath: string, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
    await vscode.workspace.getConfiguration('ets').update('sdkPath', sdkFolderPath, target)
  }

  /**
   * Get the base path of the OpenHarmony SDK.
   *
   * @returns The base path of the OpenHarmony SDK.
   */
  async getOhosSdkBasePath(): Promise<string> {
    const ignoreWorkspaceLocalPropertiesFile = await this.isIgnoreWorkspaceLocalPropertiesFile()
    if (!ignoreWorkspaceLocalPropertiesFile) {
      const workspaceDir = this.fsx.getCurrentWorkspaceDir()
      if (workspaceDir) {
        const localPropertiesPath = vscode.Uri.joinPath(workspaceDir, 'local.properties')
        if (await this.fsx.isFile(localPropertiesPath)) {
          const localProperties = await this.fsx.readFileToString(localPropertiesPath)
          const sdkDir = localProperties.split('sdk.dir=')[1]?.trim()
          if (sdkDir && typeof sdkDir === 'string' && await this.fsx.isDirectory(vscode.Uri.file(sdkDir))) return sdkDir
        }
      }
    }

    return vscode.workspace.getConfiguration('ets').get(
      'baseSdkPath',
      // eslint-disable-next-line no-template-curly-in-string
      '${os.homedir}/OpenHarmony',
    ).replace(/\$\{os\.homedir\}/g, os.homedir())
  }

  /**
   * Check if the workspace local properties file is ignored.
   *
   * @returns `true` if the workspace local properties file is ignored, `false` if the workspace local properties file is not ignored.
   */
  async isIgnoreWorkspaceLocalPropertiesFile(): Promise<boolean> {
    return vscode.workspace.getConfiguration('ets').get<boolean>('ignoreWorkspaceLocalPropertiesFile', false)
  }

  /**
   * Check if the SDK is installed.
   *
   * @param version - The version of the SDK.
   * @returns `true` if the SDK is installed, `false` if the SDK is not installed, `'incomplete'` if the SDK is installed but is incomplete.
   */
  async isInstalled(version: IsInstalledVersion | (string & {})): Promise<boolean | 'incomplete'> {
    const sdkPath = vscode.Uri.joinPath(vscode.Uri.file(await this.getOhosSdkBasePath()), version)
    if (!await this.fsx.isDirectory(sdkPath)) return false

    const dirs = (await vscode.workspace.fs.readDirectory(sdkPath)).map(([name]) => name)
    if (
      !dirs.includes('ets')
      || !dirs.includes('js')
      || !dirs.includes('native')
      || !dirs.includes('previewer')
      || !dirs.includes('toolchains')
    ) {
      return 'incomplete'
    }

    return true
  }

  /** Get the path of the Ohos SDK from `local.properties` file. */
  async getOhosSdkPathFromLocalProperties(): Promise<string | undefined> {
    try {
      const workspaceDir = vscode.workspace.workspaceFolders?.[0]?.uri
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

  private static _analyzedSdkPath: string | undefined
  private static _sdkAnalyzer: SdkAnalyzer | undefined

  public async getAnalyzedHmsSdkPath(): Promise<vscode.Uri | undefined> {
    const hmsSdkPath = vscode.workspace.getConfiguration('ets').get('hmsPath')
    if (!hmsSdkPath || typeof hmsSdkPath !== 'string') return undefined
    return vscode.Uri.file(hmsSdkPath)
  }

  /** Get the path of the Ohos SDK from `local.properties` file or configuration. */
  public async getAnalyzedSdkPath(sdkVersionGuesser: SdkVersionGuesser, force: boolean = false): Promise<string | undefined> {
    if (!force && SdkManager._analyzedSdkPath) return SdkManager._analyzedSdkPath
    const localSdkAnalyzer = await SdkAnalyzer.createLocalSdkAnalyzer(this, sdkVersionGuesser)
    const workspaceFolderAnalyzer = await SdkAnalyzer.createWorkspaceSdkAnalyzer(this)
    const globalAnalyzer = await SdkAnalyzer.createGlobalSdkAnalyzer(this)

    const { choicedAnalyzer, analyzerStatus } = await SdkAnalyzer.choiceValidSdkPath(
      localSdkAnalyzer,
      workspaceFolderAnalyzer,
      globalAnalyzer,
    )
    const sdkPath = await choicedAnalyzer?.getSdkUri(force)
    this.logger.getConsola().info(`Analyzed OHOS SDK path: ${sdkPath}, current using analyzer: ${choicedAnalyzer?.getIdentifier() || 'unknown identifier'}`)
    for (const status of analyzerStatus)
      this.logger.getConsola().info(`(${status.identifier || 'unknown identifier'}) Analyzer status: ${status.isValid ? 'available ✅' : 'no available ❌'} ${status.error ? status.error : ''}`)
    SdkManager._analyzedSdkPath = sdkPath?.fsPath
    SdkManager._sdkAnalyzer = choicedAnalyzer
    return SdkManager._analyzedSdkPath
  }

  public async getAnalyzedSdkAnalyzer(sdkVersionGuesser: SdkVersionGuesser, force: boolean = false): Promise<SdkAnalyzer | undefined> {
    if (!force && SdkManager._sdkAnalyzer) return SdkManager._sdkAnalyzer
    await this.getAnalyzedSdkPath(sdkVersionGuesser, force)
    return SdkManager._sdkAnalyzer
  }
}
