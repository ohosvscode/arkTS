import type { CustomPageTemplate, PageTemplateDefinition } from '../page-templates'
import fs from 'node:fs'
import path from 'node:path'
import { Autowired } from 'unioc'
import { Command, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { FileSystemContext } from '../context/file-system-context'
import {
  getPageTemplates,
  normalizePageName,
  planCreatePage,
  validatePageName,
} from '../page-templates'

@Command('ets.createPage')
export class CreatePageCommand implements Command {
  @Autowired(Translator) protected readonly translator: Translator
  @Autowired protected readonly fsx: FileSystemContext

  async onExecuteCommand(resource?: vscode.Uri): Promise<void> {
    const customTemplates = vscode.workspace.getConfiguration('ets').get<CustomPageTemplate[]>('customPageTemplates', [])
    const templates = getPageTemplates(customTemplates)
    const picked = await vscode.window.showQuickPick(
      templates.map(template => ({
        label: template.label ?? this.translator.t(template.labelKey ?? template.id),
        description: template.id,
        detail: template.description ?? (template.descriptionKey ? this.translator.t(template.descriptionKey) : undefined),
        template,
      })),
      {
        title: this.translator.t('page.createPage.title'),
        placeHolder: this.translator.t('page.createPage.templatePlaceholder'),
      },
    )
    if (!picked) return

    const pageNameInput = await vscode.window.showInputBox({
      title: this.translator.t('page.createPage.title'),
      prompt: this.translator.t('page.createPage.namePrompt'),
      placeHolder: this.translator.t('page.createPage.namePlaceholder'),
      validateInput: (value) => {
        const error = validatePageName(value)
        if (error === 'empty') return this.translator.t('page.createPage.nameRequired')
        if (error === 'invalid') return this.translator.t('page.createPage.nameInvalid')
        return undefined
      },
    })
    if (!pageNameInput) return

    const targetDir = await this.resolveTargetDirectory(resource)
    if (!targetDir) return

    const pageName = normalizePageName(pageNameInput)
    const pageUri = vscode.Uri.file(path.join(targetDir, `${pageName}.ets`))
    if (await this.fsx.isExists(pageUri)) {
      const overwrite = this.translator.t('page.createPage.overwrite')
      const choice = await vscode.window.showWarningMessage(
        this.translator.t('page.createPage.alreadyExists', pageUri.fsPath),
        { modal: true },
        overwrite,
      )
      if (choice !== overwrite) return
    }

    const autoRegister = vscode.workspace.getConfiguration('ets').get<boolean>('autoRegisterCreatedPage', true) !== false
    const plan = planCreatePage(picked.template, pageName, targetDir, autoRegister, {
      exists: filePath => this.existsSync(filePath),
      readFile: filePath => this.readFileSync(filePath),
    })

    await this.writePlannedFile(plan.pageFile.filePath, plan.pageFile.content)
    for (const extraFile of plan.extraFiles) {
      await this.writePlannedFile(extraFile.filePath, extraFile.content)
    }

    await vscode.window.showTextDocument(pageUri)
    vscode.window.showInformationMessage(this.translator.t(
      autoRegister && picked.template.register !== 'none'
        ? 'page.createPage.createdAndRegistered'
        : 'page.createPage.created',
      pageName,
      this.describeTemplate(picked.template),
    ))
  }

  private describeTemplate(template: PageTemplateDefinition): string {
    return template.label ?? this.translator.t(template.labelKey ?? template.id)
  }

  private async resolveTargetDirectory(resource?: vscode.Uri): Promise<string | undefined> {
    if (resource) {
      if (await this.fsx.isDirectory(resource)) return resource.fsPath
      return path.dirname(resource.fsPath)
    }

    const activePath = vscode.window.activeTextEditor?.document.uri.fsPath
    if (activePath?.endsWith('.ets')) return path.dirname(activePath)

    const moduleFiles = await vscode.workspace.findFiles('**/src/main/module.json5', '**/{oh_modules,node_modules,dist,out,build}/**', 20)
    const uniqueDirs = [...new Set(moduleFiles.map(uri => path.join(path.dirname(uri.fsPath), 'ets', 'pages')))]
    if (uniqueDirs.length === 1) return uniqueDirs[0]
    if (uniqueDirs.length > 1) {
      const picked = await vscode.window.showQuickPick(
        uniqueDirs.map(dir => ({ label: path.basename(dir), description: dir, dir })),
        {
          title: this.translator.t('page.createPage.title'),
          placeHolder: this.translator.t('page.createPage.folderPlaceholder'),
        },
      )
      if (picked) return picked.dir
    }

    const [pickedFolder] = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      title: this.translator.t('page.createPage.selectFolder'),
      defaultUri: this.fsx.getCurrentWorkspaceDir(),
    }) ?? []
    return pickedFolder?.fsPath
  }

  private existsSync(filePath: string): boolean {
    return fs.existsSync(filePath)
  }

  private readFileSync(filePath: string): string | undefined {
    try {
      if (!fs.existsSync(filePath)) return undefined
      return fs.readFileSync(filePath, 'utf8')
    }
    catch {
      return undefined
    }
  }

  private async writePlannedFile(filePath: string, content: string): Promise<void> {
    const uri = vscode.Uri.file(filePath)
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(filePath)))
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content))
  }
}
