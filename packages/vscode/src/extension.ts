/* eslint-disable perfectionist/sort-imports */
import 'reflect-metadata'
import 'source-map-support/register'
import type { LabsInfo } from '@volar/vscode'
import type { ExtensionContext } from 'vscode'
import { CommandPlugin, DebugPlugin, DisposablePlugin, L10nPlugin, TaskPlugin, VSCodeBootstrap, WatchConfigurationPlugin } from 'unioc/vscode'
import { EtsLanguageServer } from './language-server'
import type { IClassWrapper } from 'unioc'
import * as vscode from 'vscode'
import { ProjectDetectorManager } from '@arkts/language-service'
import { Uri } from '@arkts/project-detector'
import { ExtensionLogger } from '@arkts/shared/vscode'
import './frontend/commands/project-command'
import './frontend/commands/device-manager-command'
import './frontend/commands/connect-device-command'
import './views/resource-preview'
import './views/hdc-manager'
import './tasks/hvigor-assemble-hap'
import './tasks/hdc-install-hap'
import './tasks/hdc-run-ability'
import './debugger/debugger-descriptor'

class ArkTSExtension extends VSCodeBootstrap<Promise<LabsInfo | undefined>> {
  async beforeInitialize(context: ExtensionContext): Promise<void> {
    await this.createExtensionSideProjectDetectorManager(context)
    this.use(L10nPlugin)
    this.use(TaskPlugin)
    this.use(DebugPlugin)
    this.use(CommandPlugin)
    this.use(DisposablePlugin)
    this.use(WatchConfigurationPlugin)
  }

  async onActivate(context: ExtensionContext): Promise<LabsInfo | undefined> {
    await this.createClass(ExtensionLogger, ExtensionLogger).resolve()
    const languageServer = this.getGlobalContainer().findOne(EtsLanguageServer) as IClassWrapper<typeof EtsLanguageServer> | undefined
    const runResult = await languageServer?.getClassExecutor().execute({ methodName: 'run', arguments: [] })
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(document => this.autoSetLanguage(document, context, languageServer?.getInstance())))
    vscode.workspace.textDocuments.forEach(document => this.autoSetLanguage(document, context, languageServer?.getInstance()))
    if (runResult?.type === 'result') return await runResult.value
  }

  private async autoSetLanguage(document: vscode.TextDocument, context: ExtensionContext, languageServer?: EtsLanguageServer | null): Promise<vscode.TextDocument | void> {
    if (document.fileName.endsWith('.json5')) return vscode.languages.setTextDocumentLanguage(document, 'jsonc')
    // For SDK files, set the language to ets
    if (document.uri.toString().startsWith(vscode.Uri.joinPath(context.extensionUri, 'dist', 'lib').toString()) && (document.fileName.endsWith('.d.ts') || document.fileName.endsWith('.d.ets'))) {
      vscode.languages.setTextDocumentLanguage(document, 'ets')
      return
    }
    const clientOptions = await languageServer?.getClientOptions()
    if (typeof clientOptions?.initializationOptions?.ets?.sdkPath !== 'string' || !clientOptions?.initializationOptions?.ets?.sdkPath) return
    if (document.fileName.endsWith('.d.ts') && document.fileName.startsWith(clientOptions?.initializationOptions?.ets?.sdkPath)) vscode.languages.setTextDocumentLanguage(document, 'ets')
  }

  private async createExtensionSideProjectDetectorManager(context: ExtensionContext): Promise<void> {
    const projectDetectorManager = ProjectDetectorManager.create(vscode.workspace.workspaceFolders?.map(folder => folder.uri.toString()) ?? [])
    const projectDetectorManagerWatcher = vscode.workspace.createFileSystemWatcher('**/*')
    context.subscriptions.push(
      projectDetectorManagerWatcher,
      projectDetectorManagerWatcher.onDidChange(e => projectDetectorManager.emit('file-changed', Uri.file(e.toString()))),
      projectDetectorManagerWatcher.onDidCreate(e => projectDetectorManager.emit('file-created', Uri.file(e.toString()))),
      projectDetectorManagerWatcher.onDidDelete(e => projectDetectorManager.emit('file-deleted', Uri.file(e.toString()))),
    )
    await this.createValue(projectDetectorManager, ProjectDetectorManager).resolve()
  }
}

// eslint-disable-next-line no-restricted-syntax
export = new ArkTSExtension().run()
