import type { EtsServerClientOptions, SerializableTextDocument } from '@arkts/shared'
import type { LabsInfo } from '@volar/vscode'
import type { LanguageClientOptions, ServerOptions } from '@volar/vscode/node'
import * as serverProtocol from '@volar/language-server/protocol'
import { activateAutoInsertion, createLabsInfo } from '@volar/vscode'
import { LanguageClient, TransportKind } from '@volar/vscode/node'
import { sleep } from '@vstils/core'
import defu from 'defu'
import { Autowired } from 'unioc'
import { Command, Disposable, ExtensionContext, Translator, WatchConfiguration } from 'unioc/vscode'
import * as vscode from 'vscode'
import { FileSystemContext } from './context/file-system-context'
import { LanguageServerContext } from './context/server-context'
import { SdkVersionGuesser } from './sdk/sdk-guesser'
import { SdkManager } from './sdk/sdk-manager'

@Disposable
@Command('ets.restartServer')
export class EtsLanguageServer extends LanguageServerContext implements Command, Disposable, vscode.DocumentFormattingEditProvider {
  @Autowired(Translator) protected readonly translator: Translator
  @Autowired(ExtensionContext) protected readonly context: ExtensionContext
  @Autowired protected readonly fsx: FileSystemContext
  @Autowired protected readonly sdkManager: SdkManager
  @Autowired protected readonly sdkVersionGuesser: SdkVersionGuesser

  onExecuteCommand(): void {
    this.restart().catch(e => this.handleLanguageServerError(e))
  }

  onActivate(): void {
    super.onActivate()
    vscode.languages.registerDocumentFormattingEditProvider('ets', this)
    this.getConsola().info(`ETS Language Server document range formatting edit provider registered!`)
  }

  async provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[] | null> {
    const result: import('@ohos-rs/oxk').FormatResult | undefined = await this.getCurrentLanguageClient()?.sendRequest('ets/formatDocument', {
      textDocument: {
        uri: document.uri.toString(),
        text: document.getText(),
      },
    })
    if (!result || typeof result.code !== 'string' || !Array.isArray(result.errors)) return []
    if (result.errors.length > 0) {
      vscode.window.showErrorMessage(`${document.uri.fsPath} format error: ${result.errors.join(', ')}`)
      return null
    }
    const textEdit = vscode.TextEdit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), result.code)
    return [textEdit]
  }

  @WatchConfiguration()
  async onConfigurationChanged(e: vscode.ConfigurationChangeEvent): Promise<unknown> {
    // 如果 SDK 路径发生变化，重启语言服务器
    if (e.affectsConfiguration('ets.sdkPath')) {
      if (!this.getCurrentLanguageClient()?.isRunning()) {
        this.getConsola().info(`[underwrite] sdk path changed, start language server...`)
        return this.run()
      }

      try {
        // Wait the workspace/configurationChanged event send, then restart the language server
        await sleep(100)
        await this.restart(true).catch(e => this.handleLanguageServerError(e))
      }
      catch (error) {
        this.handleLanguageServerError(error)
      }
    }

    // 如果资源诊断配置发生变化，发送配置更新事件
    if (e.affectsConfiguration('ets.resourceReferenceDiagnostic')) {
      const newLevel = vscode.workspace.getConfiguration('ets').get<string>('resourceReferenceDiagnostic', 'error')
      this.getConsola().info(`Resource diagnostic level changed to: ${newLevel}`)

      // 通知语言服务器配置变更
      const client = this.getCurrentLanguageClient()
      if (client?.isRunning()) {
        await client.sendNotification('workspace/didChangeConfiguration', {
          settings: {
            ets: {
              resourceReferenceDiagnostic: newLevel,
            },
          },
        })
      }
    }
  }

  async run(): Promise<LabsInfo | undefined> {
    try {
      // First start it will be return LabsInfo object for volar.js labs extension
      const [labsInfo] = await this.start(true)
      return labsInfo!
    }
    catch (error) {
      this.handleLanguageServerError(error)
      return undefined
    }
  }

  /**
   * Get the server options for the ETS Language Server.
   *
   * @returns The server options.
   */
  private async getServerOptions(): Promise<ServerOptions> {
    const serverModule = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'server.js')
    const runOptions = { execArgv: [] as string[] }
    const debugOptions = { execArgv: ['--nolazy', `--inspect=${6009}`] }

    return {
      run: {
        module: serverModule.fsPath,
        transport: TransportKind.ipc,
        options: runOptions,
      },
      debug: {
        module: serverModule.fsPath,
        transport: TransportKind.ipc,
        options: debugOptions,
      },
    }
  }

  /**
   * Get the client options for the ETS Language Server.
   *
   * @returns The client options.
   * @throws {SdkAnalyzerException} If the SDK path have any no right, it will throw an error.
   */
  async getClientOptions(force: boolean = false): Promise<LanguageClientOptions> {
    const sdkPath = await this.sdkManager.getAnalyzedSdkPath(this.sdkVersionGuesser, force)
    const sdkAnalyzer = await this.sdkManager.getAnalyzedSdkAnalyzer(this.sdkVersionGuesser, force)
    if (!sdkPath || !sdkAnalyzer) {
      vscode.window.showErrorMessage(this.translator.t('sdk.error.validSdkPath'))
      throw new Error(this.translator.t('sdk.error.validSdkPath'))
    }

    const hmsPath = await this.sdkManager.getAnalyzedHmsSdkPath().then(uri => uri?.fsPath)

    return {
      documentSelector: [
        { language: 'ets' },
        { language: 'json' },
        { pattern: '**/*.json5' },
      ],
      outputChannel: this.getOutputChannel(),
      initializationOptions: {
        debug: vscode.workspace.getConfiguration('ets').get<boolean>('lspDebugMode'),
        ets: { sdkPath, hmsPath },
      } satisfies EtsServerClientOptions,
      synchronize: {
        fileEvents: [
          vscode.workspace.createFileSystemWatcher('**/*.ets'),
          vscode.workspace.createFileSystemWatcher('**/*.json'),
          vscode.workspace.createFileSystemWatcher('**/*.json5'),
        ],
      },
    }
  }

  /** Current language client is persisted here. */
  private _client: LanguageClient | undefined

  getCurrentLanguageClient(): LanguageClient | undefined {
    return this._client
  }

  private languageServerSubscriptions: Disposable[] = []

  async handleDidChangeTextDocumentRequest(): Promise<void> {
    this.languageServerSubscriptions.push(
      vscode.workspace.onDidChangeTextDocument((textDocumentChangeEvent) => {
        // ⚠️ Performance: only send file:// scheme text documents
        if (textDocumentChangeEvent.document.uri.scheme !== 'file') return
        const textDocument: SerializableTextDocument = {
          uri: textDocumentChangeEvent.document.uri.toString(),
          languageId: textDocumentChangeEvent.document.languageId,
          version: textDocumentChangeEvent.document.version,
          text: textDocumentChangeEvent.document.getText(),
        }
        this._client?.sendRequest('ets/onDidChangeTextDocument', { textDocument })
      }),
    )
  }

  /**
   * Start the ETS Language Server.
   *
   * @returns The labs info.
   * @param force Whether to force the restart.
   * @throws {SdkAnalyzerException} If the SDK path have any no right, it will throw an error.
   */
  async start(force: boolean = false, overrideClientOptions: LanguageClientOptions = {}): Promise<[LabsInfo | undefined, LanguageClientOptions]> {
    const [serverOptions, clientOptions] = await Promise.all([
      this.getServerOptions(),
      this.getClientOptions(force),
    ])
    this.configureTypeScriptPlugin(clientOptions)

    const start = (type: 'restarted' | 'started'): [undefined, LanguageClientOptions] => {
      this._client?.start()
      this.handleDidChangeTextDocumentRequest()
      // support for auto close tag
      if (this._client) activateAutoInsertion('ets', this._client)
      this.getConsola().info(`ETS Language Server ${type}!`)
      vscode.window.setStatusBarMessage(`ETS Language Server ${type}!`, 1000)
      return [undefined, clientOptions]
    }

    // If the lsp is already created, just restart the lsp
    if (this._client) return start('restarted')

    // If the lsp is not created, create a new one
    this._client = new LanguageClient(
      'ets-language-server',
      'ETS Language Server',
      serverOptions,
      defu(overrideClientOptions, clientOptions),
    )
    start('started')

    // support for https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volarjs-labs
    // ref: https://twitter.com/johnsoncodehk/status/1656126976774791168
    const labsInfo = createLabsInfo(serverProtocol)
    labsInfo.addLanguageClient(this._client)
    return [labsInfo.extensionExports!, clientOptions]
  }

  /**
   * Stop the ETS Language Server.
   *
   * @returns {Promise<void>}
   */
  async stop(): Promise<void> {
    if (this._client) {
      await this._client.stop()
      await Promise.all(this.languageServerSubscriptions.map(async subscription => await subscription.dispose()))
      this.languageServerSubscriptions = []
      this.getConsola().info('ETS Language Server stopped!')
      vscode.window.setStatusBarMessage('ETS Language Server stopped!', 1000)
    }
  }

  /**
   * Restart the ETS Language Server.
   *
   * @param force Whether to force the restart.
   * @param overrideClientOptions The override client options.
   * @throws {SdkAnalyzerException} If the SDK path have any no right, it will throw an error.
   */
  async restart(force: boolean = false, overrideClientOptions: LanguageClientOptions = {}): Promise<void> {
    this.getConsola().info(`======================= Restarting ETS Language Server =======================`)
    await vscode.commands.executeCommand('typescript.restartTsServer')
    await this.stop()
    await this.start(force, overrideClientOptions)
    const reloadWindow = this.translator.t('ets.language-server.restart.reloadWindow.button')
    const reloadWindowChoice = await vscode.window.showInformationMessage(
      this.translator.t('ets.language-server.restart.reloadWindow'),
      reloadWindow,
    )
    if (reloadWindowChoice === reloadWindow) {
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
      await vscode.commands.executeCommand('workbench.action.reloadWindow')
    }
  }
}
