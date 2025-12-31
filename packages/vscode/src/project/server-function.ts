import * as fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { effect, signal } from 'alien-signals'
import axios, { AxiosError } from 'axios'
import { BirpcReturn } from 'birpc'
import { unzip, Unzipped } from 'fflate'
import hbs from 'handlebars'
import { nanoid } from 'nanoid'
import { Autowired, Service } from 'unioc'
import { ExtensionContext } from 'unioc/vscode'
import * as vscode from 'vscode'
import { ProtocolContext } from '../context/protocol-context'
import { Translator } from '../translate'
import { ProjectConnectionProtocol } from './interfaces/connection-protocol'

hbs.registerHelper('equal', (a: number | string, b: number | string) => Number(a) === Number(b) || String(a) === String(b))

@Service
export class ServerFunctionImpl extends ProtocolContext implements ProjectConnectionProtocol.ServerFunction {
  @Autowired
  protected readonly translator: Translator

  @Autowired(ExtensionContext)
  private readonly extensionContext: vscode.ExtensionContext

  async stat(path: string): Promise<false | ProjectConnectionProtocol.File.Stat> {
    const isExists = fs.existsSync(path)
    if (!isExists) return false

    return {
      isFile: fs.statSync(path).isFile(),
      isDirectory: fs.statSync(path).isDirectory(),
    }
  }

  async readDirectory(path: string): Promise<false | string[]> {
    if (!fs.existsSync(path)) return false
    const isDirectory = fs.statSync(path).isDirectory()
    if (!isDirectory) return false
    return fs.readdirSync(path)
  }

  async getHomeDirectory(): Promise<string> {
    return os.homedir()
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
    ServerFunctionImpl.openDialog(
      [
        dialogId,
        vscode.window.showOpenDialog(options),
      ],
    )
    return dialogId
  }

  onRpcInitialized(rpc: BirpcReturn<ProjectConnectionProtocol.ClientFunction, ProjectConnectionProtocol.ServerFunction>): void {
    effect(() => {
      const [dialogId, openDialog] = ServerFunctionImpl.openDialog() ?? []
      if (!dialogId) return
      openDialog?.then(uri => rpc.onOpenDialog(dialogId, uri?.map(u => u.fsPath)))
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

    const response = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: this.translator.t('project.templateMarket.downloading', { args: [url] }),
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
      if (!fs.existsSync(uri.fsPath)) fs.mkdirSync(uri.fsPath, { recursive: true })
      for (const [filePath, file] of Object.entries(extractedFileList)) {
        const outputPath = path.resolve(uri.fsPath, filePath)
        fs.mkdirSync(path.dirname(outputPath), { recursive: true })
        if (!file) continue
        if (file.length === 0) continue
        fs.writeFileSync(outputPath, file)
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
    const templatePath = vscode.Uri.joinPath(this.extensionContext.extensionUri, 'templates', templateName)
    const templateFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(templatePath, '**/*'))

    const templateContents: ([string, string | Uint8Array<ArrayBufferLike>])[] = await Promise.all(
      templateFiles.map(async (fileUri) => {
        const fileContent = await vscode.workspace.fs.readFile(fileUri)
        if (path.extname(fileUri.fsPath) !== '.hbs') return [hbs.compile(fileUri.fsPath)(context), fileContent]
        return [hbs.compile(fileUri.fsPath)(context).replace(/\.hbs$/, ''), hbs.compile(fileContent.toString())(context)]
      }),
    )

    if (!fs.existsSync(savePath)) fs.mkdirSync(savePath, { recursive: true })
    for (const [filePath, fileContent] of templateContents) {
      const outputPath = path.resolve(savePath, path.relative(templatePath.fsPath, filePath))
      this.getConsola().info('[ServerFunction.CreateProject] Creating project file:', outputPath)
      if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, fileContent)
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
    if (result === open) await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(savePath))
  }
}
