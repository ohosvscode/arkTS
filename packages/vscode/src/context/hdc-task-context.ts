import type { ProjectLevelBuildProfile } from '@arkts/project-detector'
import JSON5 from 'json5'
import * as vscode from 'vscode'
import { TaskContext } from './task-context'

interface AppJson5 {
  app: {
    bundleName: string
  }
}

export abstract class HdcTaskContext extends TaskContext {
  protected async getProjectRootUriByTask(task: vscode.Task): Promise<vscode.Uri | Error> {
    return typeof task.scope !== 'number'
      ? task.scope?.uri
        ? task.scope?.uri
        : vscode.workspace.workspaceFolders?.[0]?.uri
          ? vscode.workspace.workspaceFolders?.[0]?.uri
          : new Error('Cannot find project root.')
      : new Error('Cannot find project root.')
  }

  protected async getAppConfigUriByTask(task: vscode.Task): Promise<vscode.Uri | Error> {
    const projectRootUri = await this.getProjectRootUriByTask(task)
    if (projectRootUri instanceof Error) return projectRootUri
    if (!projectRootUri) return new Error('Cannot find project root.')
    return vscode.Uri.joinPath(projectRootUri, 'AppScope', 'app.json5')
  }

  protected async readAppConfigByTask(task: vscode.Task): Promise<AppJson5 | Error> {
    const appConfigUri = await this.getAppConfigUriByTask(task)
    if (appConfigUri instanceof Error) return appConfigUri
    return await vscode.workspace.fs.readFile(appConfigUri).then(
      data => JSON5.parse(data.toString()),
      () => new Error('Cannot find app.json5.'),
    )
  }

  protected async getModuleSourceFolder(moduleName: string, projectRootUri: vscode.Uri): Promise<vscode.Uri | Error> {
    const buildProfileUri = vscode.Uri.joinPath(projectRootUri, 'build-profile.json5')
    const buildProfile: ProjectLevelBuildProfile | undefined = await vscode.workspace.fs.readFile(buildProfileUri).then(
      data => JSON5.parse(data.toString()),
      () => undefined,
    )
    if (!buildProfile) return new Error('Cannot find build-profile.json5.')
    if (!Array.isArray(buildProfile.modules)) return new Error('Cannot find modules in build-profile.json5.')
    const module = buildProfile.modules.find(module => module.name === moduleName)
    if (!module) return new Error(`Cannot find module ${moduleName} in build-profile.json5.`)
    if (typeof module.srcPath !== 'string') return new Error(`Cannot find module ${moduleName} srcPath.`)
    return vscode.Uri.joinPath(projectRootUri, module.srcPath)
  }
}
