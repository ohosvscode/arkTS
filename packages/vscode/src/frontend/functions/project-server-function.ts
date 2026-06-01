import type { ProjectWritePathErrorCode } from '../../utils/project-write-path-guard'
import os from 'node:os'
import path from 'node:path'
import { effect, signal } from 'alien-signals'
import axios, { AxiosError } from 'axios'
import { unzip, Unzipped } from 'fflate'
import hbs from 'handlebars'
import { nanoid } from 'nanoid'
import { Autowired, Service } from 'unioc'
import { ExtensionContext, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { ProtocolContext } from '../../context/protocol-context'
import { InitialCallbackEvent } from '../../context/webview-context'
import {
  assertProjectFilesCanBeCreated,
  ensureEmptyProjectDirectory,
  validateProjectWriteDirectory,
  writeFileExclusive,
} from '../../utils/project-write-path-fs'
import {
  ProjectWritePathError,

  resolveArchiveEntryPath,
} from '../../utils/project-write-path-guard'
import { ProjectConnectionProtocol } from '../interfaces/project-connection-protocol'

hbs.registerHelper('equal', (a: number | string, b: number | string) => Number(a) === Number(b) || String(a) === String(b))

@Service
export class ProjectServerFunctionImpl extends ProtocolContext<ProjectConnectionProtocol.ClientFunction, ProjectConnectionProtocol.ServerFunction> implements ProjectConnectionProtocol.ServerFunction {
  @Autowired(Translator)
  protected readonly translator: Translator

  @Autowired(ExtensionContext)
  protected readonly extensionContext: vscode.ExtensionContext

  async stat(path: string): Promise<false | ProjectConnectionProtocol.File.Stat> {
    try {
      const uri = vscode.Uri.file(path)
      const stat = await vscode.workspace.fs.stat(uri)
      return {
        isFile: stat.type === vscode.FileType.File,
        isDirectory: stat.type === vscode.FileType.Directory,
      }
    }
    catch {
      return false
    }
  }

  async readDirectory(path: string): Promise<false | string[]> {
    try {
      const uri = vscode.Uri.file(path)
      const stat = await vscode.workspace.fs.stat(uri)
      if (stat.type !== vscode.FileType.Directory) return false
      const entries = await vscode.workspace.fs.readDirectory(uri)
      return entries.map(([name]) => name)
    }
    catch {
      return false
    }
  }

  async getHomeDirectory(): Promise<string> {
    return os.homedir()
  }

  private formatProjectWritePathError(error: ProjectWritePathError): string {
    const keys: Record<ProjectWritePathErrorCode, string> = {
      INVALID_PATH: 'project.writePath.invalid',
      NOT_DIRECTORY: 'project.createProject.savePathNotDirectory',
      NOT_EMPTY: 'project.createProject.savePathHasFiles',
      FILE_EXISTS: 'project.writePath.fileExists',
      ZIP_SLIP: 'project.writePath.zipSlip',
      BLOCKED_SYSTEM_PATH: 'project.writePath.blockedSystemPath',
    }
    const key = keys[error.code]
    return error.detail ? this.translator.t(key, error.detail) : this.translator.t(key)
  }

  private rethrowProjectWritePathError(error: unknown): never {
    if (error instanceof ProjectWritePathError) {
      throw new Error(this.formatProjectWritePathError(error))
    }
    throw error
  }

  async requestTemplateMarketList(request: ProjectConnectionProtocol.ServerFunction.RequestTemplateMarketList.Request): Promise<ProjectConnectionProtocol.ServerFunction.RequestTemplateMarketList.Response> {
    const response = await axios.post('https://svc-drcn.developer.huawei.com/partnerVectorServlet/market/product/list', {
      lang: 'zh_CN',
      pageIndex: request?.pageIndex ?? 1,
      pageSize: request?.pageSize ?? 10,
      categoryIdL1: '4437348dd20f48249540d1b57ef2eff6',
      categoryIdL2: 'categoryL2_202410080002',
      categoryNameL2: '模板',
      ...request,
    })
    if (ProjectConnectionProtocol.ServerFunction.RequestTemplateMarketList.Response.is(response.data)) {
      this.getConsola().info('[ServerFunction.RequestTemplateMarketList] response success:', JSON.stringify(response.data))
      return response.data
    }
    this.getConsola().error('[ServerFunction.RequestTemplateMarketList] Invalid response:', JSON.stringify(response.data))
    throw new AxiosError('[ServerFunction.RequestTemplateMarketList] Invalid response.', 'INVALID_RESPONSE', response.config, response.request, response)
  }

  async requestTemplateMarketDetail(productId: string): Promise<ProjectConnectionProtocol.ServerFunction.RequestTemplateMarketDetail.Response> {
    const response = await axios.post(`https://svc-drcn.developer.huawei.com/partnerVectorServlet/market/buyerQueryProductDetail`, {
      lang: 'zh_CN',
      productId,
    })
    if (ProjectConnectionProtocol.ServerFunction.RequestTemplateMarketDetail.Response.is(response.data)) {
      this.getConsola().info('[ServerFunction.RequestTemplateMarketDetail] response success:', JSON.stringify(response.data))
      return response.data
    }
    this.getConsola().error('[ServerFunction.RequestTemplateMarketDetail] Invalid response:', JSON.stringify(response.data))
    throw new AxiosError('[ServerFunction.RequestTemplateMarketDetail] Invalid response.', 'INVALID_RESPONSE', response.config, response.request, response)
  }

  static readonly openDialog = signal<[string, Thenable<vscode.Uri[] | undefined>]>()

  async createOpenDialog(options?: ProjectConnectionProtocol.ServerFunction.CreateOpenDialog.Options): Promise<string> {
    const dialogId = nanoid()
    ProjectServerFunctionImpl.openDialog(
      [
        dialogId,
        vscode.window.showOpenDialog(options),
      ],
    )
    return dialogId
  }

  onRpcInitialized(ctx: InitialCallbackEvent<ProjectConnectionProtocol.ClientFunction, ProjectConnectionProtocol.ServerFunction>): void {
    super.onRpcInitialized(ctx)
    effect(() => {
      const [dialogId, openDialog] = ProjectServerFunctionImpl.openDialog() ?? []
      if (!dialogId) return
      openDialog?.then(uri => ctx.connection.onOpenDialog(dialogId, uri?.map(u => u.fsPath)))
    })
  }

  async downloadAndExtractTemplate(url: string): Promise<void> {
    const [uri] = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      title: this.translator.t('project.templateMarket.downloadTo'),
    }) ?? []
    if (!uri) return

    let resolvedExtractRoot: string
    try {
      resolvedExtractRoot = await validateProjectWriteDirectory(uri.fsPath, os.homedir())
    }
    catch (error) {
      this.rethrowProjectWritePathError(error)
    }

    const response = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: this.translator.t('project.templateMarket.downloading', url),
      cancellable: true,
    }, async (_, token) => {
      if (token.isCancellationRequested) return
      const abortController = new AbortController()
      const onCancellationRequestedDisposeable = token.onCancellationRequested(() => {
        abortController.abort()
        vscode.window.showInformationMessage(this.translator.t('project.templateMarket.downloading.cancelled'))
      })
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        signal: abortController.signal,
      })
      onCancellationRequestedDisposeable.dispose()
      return response.data
    })

    if (!response) throw new Error('Failed to download template.')

    this.getConsola().info('[ServerFunction.DownloadAndExtractTemplate] response success, starting to extract...')
    const extractedFileList = await new Promise<Unzipped>((resolve, reject) => {
      unzip(new Uint8Array(response), (err, data) => {
        if (err) {
          this.getConsola().error('[ServerFunction.DownloadAndExtractTemplate] Error:', err)
          reject(err)
        }
        this.getConsola().info('[ServerFunction.DownloadAndExtractTemplate] extract success, starting to write to file...', Object.keys(data))
        resolve(data)
      })
    })

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: this.translator.t('project.templateMarket.extracting'),
      cancellable: false,
    }, async () => {
      const writes: { outputPath: string, content: Uint8Array }[] = []
      for (const [filePath, file] of Object.entries(extractedFileList)) {
        if (!file || file.length === 0) continue
        writes.push({
          outputPath: resolveArchiveEntryPath(resolvedExtractRoot, filePath),
          content: file,
        })
      }

      try {
        await assertProjectFilesCanBeCreated(writes.map(write => write.outputPath))
        await ensureEmptyProjectDirectory(resolvedExtractRoot)
        for (const { outputPath, content } of writes) {
          await writeFileExclusive(outputPath, content)
        }
      }
      catch (error) {
        this.rethrowProjectWritePathError(error)
      }

      this.getConsola().info('[ServerFunction.DownloadAndExtractTemplate] Success!')
    })

    const open = this.translator.t('project.openProject')
    const cancel = this.translator.t('project.cancel')
    const result = await vscode.window.showInformationMessage(
      this.translator.t('project.templateMarket.extracted'),
      { modal: true },
      open,
      cancel,
    )
    if (result === open) await vscode.commands.executeCommand('vscode.openFolder', uri)
  }

  async createProject(context: Record<string, string | number | boolean | string[]>, templateName: string, savePath: string): Promise<void> {
    this.getConsola().info('[ServerFunction.CreateProject] Creating project...', JSON.stringify(context))
    if (!this.extensionContext) return this.getConsola().error('[ServerFunction.CreateProject] Extension context not found, cannot create project.')

    let resolvedSavePath: string
    try {
      resolvedSavePath = await validateProjectWriteDirectory(savePath, os.homedir())
    }
    catch (error) {
      this.rethrowProjectWritePathError(error)
    }

    const templatePath = vscode.Uri.joinPath(this.extensionContext.extensionUri, 'templates', templateName)
    const templateFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(templatePath, '**/*'))

    const templateContents: ([string, string | Uint8Array<ArrayBufferLike>])[] = await Promise.all(
      templateFiles.map(async (fileUri) => {
        const fileContent = await vscode.workspace.fs.readFile(fileUri)
        if (path.extname(fileUri.fsPath) !== '.hbs') return [hbs.compile(fileUri.fsPath)(context), fileContent]
        return [hbs.compile(fileUri.fsPath)(context).replace(/\.hbs$/, ''), hbs.compile(fileContent.toString())(context)]
      }),
    )

    const writes = templateContents.map(([filePath, fileContent]) => ({
      outputPath: path.resolve(resolvedSavePath, path.relative(templatePath.fsPath, filePath)),
      content: fileContent,
    }))

    try {
      await assertProjectFilesCanBeCreated(writes.map(write => write.outputPath))
      await ensureEmptyProjectDirectory(resolvedSavePath)
      for (const { outputPath, content } of writes) {
        this.getConsola().info('[ServerFunction.CreateProject] Creating project file:', outputPath)
        await writeFileExclusive(outputPath, content)
      }
    }
    catch (error) {
      this.rethrowProjectWritePathError(error)
    }

    this.getConsola().info('[ServerFunction.CreateProject] Project created successfully!')
    const open = this.translator.t('project.openProject')
    const cancel = this.translator.t('project.cancel')
    const result = await vscode.window.showInformationMessage(
      this.translator.t('project.createProject.projectCreated'),
      { modal: true },
      open,
      cancel,
    )
    if (result === open) await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(resolvedSavePath))
  }
}
