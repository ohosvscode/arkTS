/* eslint-disable perfectionist/sort-imports */
import 'reflect-metadata'
import type { LabsInfo } from '@volar/vscode'
import type { ExtensionContext } from 'vscode'
import { extensionContext } from 'reactive-vscode'
import { CommandPlugin, DisposablePlugin, LanguageProviderPlugin, VSCodeBootstrap, WatchConfigurationPlugin } from 'unioc/vscode'
import { EtsLanguageServer } from './language-server'
import type { IClassWrapper } from 'unioc'
import * as vscode from 'vscode'
import { ProjectDetectorManager } from '@arkts/language-service'
import './project/command'

class ArkTSExtension extends VSCodeBootstrap<Promise<LabsInfo | undefined>> {
  beforeInitialize(context: ExtensionContext): Promise<void> | void {
    this.use(CommandPlugin)
    this.use(LanguageProviderPlugin)
    this.use(DisposablePlugin)
    this.use(WatchConfigurationPlugin)
    extensionContext.value = context
  }

  private async autoSetLanguage(document: vscode.TextDocument, languageServer?: EtsLanguageServer | null): Promise<vscode.TextDocument | void> {
    if (document.fileName.endsWith('.json5')) return vscode.languages.setTextDocumentLanguage(document, 'jsonc')
    const clientOptions = await languageServer?.getClientOptions()
    if (typeof clientOptions?.initializationOptions?.ohos?.sdkPath !== 'string' || !clientOptions?.initializationOptions?.ohos?.sdkPath) return
    if (document.fileName.endsWith('.d.ts') && document.fileName.startsWith(clientOptions?.initializationOptions?.ohos?.sdkPath)) vscode.languages.setTextDocumentLanguage(document, 'ets')
  }

  async onActivate(context: ExtensionContext): Promise<LabsInfo | undefined> {
    const globalContainer = this.getGlobalContainer()
    const projectDetectorManager = ProjectDetectorManager.create(vscode.workspace.workspaceFolders?.map(folder => folder.uri.toString()) ?? [])
    this.createValue(projectDetectorManager, ProjectDetectorManager)
    const languageServer = globalContainer.findOne(EtsLanguageServer) as IClassWrapper<typeof EtsLanguageServer> | undefined
    const runResult = await languageServer?.getClassExecutor().execute({
      methodName: 'run',
      arguments: [],
    })

    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(async document => this.autoSetLanguage(document, languageServer?.getInstance())))
    vscode.workspace.textDocuments.forEach(async document => this.autoSetLanguage(document, languageServer?.getInstance()))

    if (runResult?.type === 'result') return await runResult.value
  }
}

// eslint-disable-next-line no-restricted-syntax
export = new ArkTSExtension().run()
