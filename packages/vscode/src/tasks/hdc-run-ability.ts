import child_process from 'node:child_process'
import { typeAssert } from '@arkts/shared'
import { Autowired } from 'unioc'
import { Disposable, TaskProvider, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { HdcTaskContext } from '../context/hdc-task-context'
import { TaskPropertiesMap } from '../generated/meta'
import { HdcManager } from '../hdc-manager'

type HdcRunAbilityTaskProperties = TaskPropertiesMap['hdc-run-ability']

export interface HdcRunAbilityTaskDefinition extends vscode.TaskDefinition, HdcRunAbilityTaskProperties {}

@Disposable
@TaskProvider('hdc-run-ability')
export class HdcRunAbilityTaskProvider extends HdcTaskContext implements TaskProvider {
  @Autowired private readonly hdcManager: HdcManager
  @Autowired(Translator) private readonly translator: Translator

  provideTasks(): vscode.ProviderResult<vscode.Task[]> {
    return [
      new vscode.Task(
        { type: 'hdc-run-ability' },
        vscode.TaskScope.Workspace,
        'Hdc Run Ability',
        'hdc-run-ability',
      ),
    ]
  }

  async resolveTask(task: vscode.Task): Promise<vscode.Task> {
    const hdcPath = await this.hdcManager.getHdcPath()
    if (!hdcPath) return this.createExitTask(task, this.translator.t('tasks.error.hdcNotFoundInSystemEnvironmentVariables'))

    const currentConnectKey = this.hdcManager.getCurrentConnectKey()
    if (currentConnectKey === 0) return this.createExitTask(task, this.translator.t('tasks.error.deviceNotSelected'))
    if (currentConnectKey === -1) return this.createExitTask(task, this.translator.t('tasks.error.deviceNotConnected'))

    const appConfigUri = await this.getAppConfigUriByTask(task)
    if (appConfigUri instanceof Error) return this.createExitTask(task, appConfigUri.message)
    const appConfig = await this.readAppConfigByTask(task)
    if (appConfig instanceof Error) return this.createExitTask(task, appConfig.message)
    if (typeof appConfig?.app?.bundleName !== 'string' || !appConfig.app.bundleName.trim()) return this.createExitTask(task, this.translator.t('tasks.error.appJson5BundleNameNotFound', appConfigUri.toString()))

    return new vscode.Task(
      task.definition,
      vscode.TaskScope.Workspace,
      'Hdc Run Ability',
      'hdc-run-ability',
      new vscode.CustomExecution(async () => {
        const closeEmitter = new vscode.EventEmitter<void | number>()
        const writeEmitter = new vscode.EventEmitter<string>()

        return {
          close: () => closeEmitter.dispose(),
          onDidWrite: writeEmitter.event,
          onDidClose: closeEmitter.event,
          open: async () => {
            const startTime = performance.now()
            typeAssert<HdcRunAbilityTaskDefinition>(task.definition)
            writeEmitter.fire(this.log(`Launching ${appConfig.app.bundleName}...`, true))

            const runAbilityCommand = `hdc -t ${currentConnectKey} shell aa start -a ${task.definition.abilityName ?? 'EntryAbility'} -b ${appConfig.app.bundleName}`
            writeEmitter.fire(this.log(runAbilityCommand))
            const runAbilityOutput = child_process.execSync(runAbilityCommand, { encoding: 'utf-8' }).trim()
            writeEmitter.fire(runAbilityOutput)
            if (runAbilityOutput) writeEmitter.fire('\r\n')

            const endTime = performance.now()
            writeEmitter.fire(this.log(`${appConfig.app.bundleName} successfully launched within ${((endTime - startTime) / 1000).toFixed(2)}s`, true))

            writeEmitter.fire('\r\n')
            closeEmitter.fire(0)
          },
        }
      }),
    )
  }
}
