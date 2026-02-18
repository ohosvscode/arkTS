import type { TaskPropertiesMap } from '../generated/meta'
import child_process from 'node:child_process'
import { typeAssert } from '@arkts/shared'
import { nanoid } from 'nanoid'
import { Autowired } from 'unioc'
import { Disposable, TaskProvider, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { HdcTaskContext } from '../context/hdc-task-context'
import { HdcManager } from '../hdc-manager'

type HdcInstallHapTaskProperties = TaskPropertiesMap['hdc-install-hap']

export interface HdcInstallHapTaskDefinition extends vscode.TaskDefinition, HdcInstallHapTaskProperties {}

@Disposable
@TaskProvider('hdc-install-hap')
export class HdcInstallTaskProvider extends HdcTaskContext implements TaskProvider {
  @Autowired
  private readonly hdcManager: HdcManager

  @Autowired(Translator)
  private readonly translator: Translator

  provideTasks(): vscode.ProviderResult<vscode.Task[]> {
    return [
      new vscode.Task(
        { type: 'hdc-install-hap' },
        vscode.TaskScope.Workspace,
        'Hdc Install',
        'hdc-install-hap',
      ),
    ]
  }

  private async resolveHapPath(task: vscode.Task, projectRootUri: vscode.Uri): Promise<vscode.Uri | vscode.Task> {
    const moduleSourceFolder = await this.getModuleSourceFolder(task.definition.moduleName, projectRootUri)
    if (moduleSourceFolder instanceof Error) return this.createExitTask(task, moduleSourceFolder.message)
    typeAssert<HdcInstallHapTaskDefinition>(task.definition)
    if (task.definition.hapPath) return vscode.Uri.joinPath(moduleSourceFolder, task.definition.hapPath)
    return vscode.Uri.joinPath(
      moduleSourceFolder,
      'build',
      task.definition.productName,
      'outputs',
      task.definition.productName,
      `${task.definition.moduleName}-${task.definition.productName}-unsigned.hap`,
    )
  }

  async resolveTask(task: vscode.Task): Promise<vscode.Task | undefined> {
    const hdcPath = await this.hdcManager.getHdcPath()
    if (!hdcPath) return this.createExitTask(task, this.translator.t('tasks.error.hdcNotFoundInSystemEnvironmentVariables'))

    const currentConnectKey = this.hdcManager.getCurrentConnectKey()
    if (currentConnectKey === 0) return this.createExitTask(task, this.translator.t('tasks.error.deviceNotSelected'))
    if (currentConnectKey === -1) return this.createExitTask(task, this.translator.t('tasks.error.deviceNotConnected'))

    typeAssert<HdcInstallHapTaskDefinition>(task.definition)

    const projectRootUri = await this.getProjectRootUriByTask(task)
    if (projectRootUri instanceof Error) return this.createExitTask(task, projectRootUri.message)
    const appConfigUri = vscode.Uri.joinPath(projectRootUri, 'AppScope', 'app.json5')
    const appConfig = await this.readAppConfigByTask(task)
    if (appConfig instanceof Error) return this.createExitTask(task, appConfig.message)
    if (typeof appConfig?.app?.bundleName !== 'string' || !appConfig.app.bundleName.trim()) return this.createExitTask(task, this.translator.t('tasks.error.appJson5BundleNameNotFound', appConfigUri.toString()))

    const hapPath = await this.resolveHapPath(task, projectRootUri)
    if (hapPath instanceof vscode.Task) return hapPath

    return new vscode.Task(
      task.definition,
      vscode.TaskScope.Workspace,
      'Hdc Install',
      'hdc-install-hap',
      new vscode.CustomExecution(async () => {
        const closeEmitter = new vscode.EventEmitter<void | number>()
        const writeEmitter = new vscode.EventEmitter<string>()

        return {
          close: () => closeEmitter.dispose(),
          onDidWrite: writeEmitter.event,
          onDidClose: closeEmitter.event,
          open: async () => {
            const startTime = performance.now()
            typeAssert<HdcInstallHapTaskDefinition>(task.definition)
            writeEmitter.fire(this.log(`Installing ${appConfig.app.bundleName}...`, true))

            const forceStopCommand = `hdc -t ${currentConnectKey} shell aa force-stop ${appConfig.app.bundleName}`
            writeEmitter.fire(this.log(forceStopCommand))
            const forceStopOutput = child_process.execSync(forceStopCommand, { encoding: 'utf-8' }).trim()
            writeEmitter.fire(forceStopOutput)
            if (forceStopOutput) writeEmitter.fire('\r\n')

            const cacheDirectoryName = nanoid().replace(/-/g, 'a').replace(/_/g, 'b')
            const createCacheDirectoryCommand = `hdc -t ${currentConnectKey} shell mkdir data/local/tmp/${cacheDirectoryName}`
            writeEmitter.fire(this.log(createCacheDirectoryCommand))
            const createCacheDirectoryOutput = child_process.execSync(createCacheDirectoryCommand, { encoding: 'utf-8' }).trim()
            writeEmitter.fire(createCacheDirectoryOutput)
            if (createCacheDirectoryOutput) writeEmitter.fire('\r\n')

            const fileSendCommand = `hdc -t ${currentConnectKey} file send ${hapPath.fsPath} "data/local/tmp/${cacheDirectoryName}"`
            writeEmitter.fire(this.log(fileSendCommand))
            const fileSendOutput = child_process.execSync(fileSendCommand, { encoding: 'utf-8' }).trim()
            writeEmitter.fire(fileSendOutput)
            if (fileSendOutput) writeEmitter.fire('\r\n')

            const installHapCommand = `hdc -t ${currentConnectKey} shell bm install -p data/local/tmp/${cacheDirectoryName}`
            writeEmitter.fire(this.log(installHapCommand))
            const installHapOutput = child_process.execSync(installHapCommand, { encoding: 'utf-8' }).trim()
            writeEmitter.fire(installHapOutput)
            if (installHapOutput) writeEmitter.fire('\r\n')

            const clearCacheCommand = `hdc -t ${currentConnectKey} shell rm -rf data/local/tmp/${cacheDirectoryName}`
            writeEmitter.fire(this.log(clearCacheCommand))
            const clearCacheOutput = child_process.execSync(clearCacheCommand, { encoding: 'utf-8' }).trim()
            writeEmitter.fire(clearCacheOutput)
            if (clearCacheOutput) writeEmitter.fire('\r\n')

            const endTime = performance.now()
            writeEmitter.fire(this.log(`${appConfig.app.bundleName} successfully installed within ${((endTime - startTime) / 1000).toFixed(2)}s`, true))

            writeEmitter.fire('\r\n')
            closeEmitter.fire(0)
          },
        }
      }),
    )
  }
}
