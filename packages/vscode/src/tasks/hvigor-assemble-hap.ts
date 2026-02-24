import type { TaskPropertiesMap } from '../generated/meta'
import child_process from 'node:child_process'
import { typeAssert } from '@arkts/shared'
import { Autowired } from 'unioc'
import { Disposable, TaskProvider, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import which from 'which'
import { TaskContext } from '../context/task-context'
import { HdcManager } from '../hdc-manager'

type HvigorAssembleHapTaskProperties = TaskPropertiesMap['hvigor-assemble-hap']

export interface HvigorAssembleHapTaskDefinition extends vscode.TaskDefinition, HvigorAssembleHapTaskProperties {}

@Disposable
@TaskProvider('hvigor-assemble-hap')
export class HvigorAssembleHapTaskProvider extends TaskContext implements TaskProvider {
  @Autowired(Translator) private readonly translator: Translator
  @Autowired private readonly hdcManager: HdcManager

  private getHvigorPath(): string | null {
    return which.sync('hvigorw', { nothrow: true }) ?? which.sync('hvigor', { nothrow: true })
  }

  private getHvigorArgs(deviceType: string, task?: HvigorAssembleHapTaskDefinition): string[] {
    return [
      '--mode module',
      `-p module=${task?.moduleName}@${task?.productName}`,
      `-p product=${task?.productName}`,
      (task?.requiredDeviceType || deviceType) ? `-p requiredDeviceType=${task?.requiredDeviceType ?? deviceType}` : '',
      'assembleHap',
      `--analyze=${task?.analyze ?? 'normal'}`,
      task?.parallel === true || task?.parallel === undefined ? '--parallel' : '',
      task?.incremental === true || task?.incremental === undefined ? '--incremental' : '',
      task?.daemon === true || task?.daemon === undefined ? '--daemon' : '',
      ...(Array.isArray(task?.args) ? task.args : []),
    ].filter(Boolean)
  }

  provideTasks(): vscode.Task[] {
    return [
      new vscode.Task(
        { type: 'hvigor-assemble-hap' },
        vscode.TaskScope.Workspace,
        'Hvigor Assemble Hap',
        'hvigor-assemble-hap',
      ),
    ]
  }

  async resolveTask(task: vscode.Task): Promise<vscode.Task | undefined> {
    const hdcPath = await this.hdcManager.getHdcPath()
    if (!hdcPath) return this.createExitTask(task, this.translator.t('tasks.error.hdcNotFoundInSystemEnvironmentVariables'))

    const hvigorPath = this.getHvigorPath()
    if (!hvigorPath) return this.createExitTask(task, this.translator.t('tasks.error.hvigorNotFoundInSystemEnvironmentVariables'))

    const currentConnectKey = this.hdcManager.getCurrentConnectKey()
    let deviceType = ''

    if (typeof currentConnectKey !== 'number') {
      deviceType = child_process.execSync(`${hdcPath} -t ${currentConnectKey} shell param get "const.product.devicetype"`, { encoding: 'utf-8' }).trim()
      if (deviceType.includes('Fail')) deviceType = ''
    }

    typeAssert<HvigorAssembleHapTaskDefinition>(task.definition)

    return new vscode.Task(
      task.definition,
      vscode.TaskScope.Workspace,
      'Hvigor Assemble Hap',
      'hvigor-assemble-hap',
      new vscode.ProcessExecution(hvigorPath, this.getHvigorArgs(deviceType, task.definition as HvigorAssembleHapTaskDefinition), {
        cwd: task.definition.projectRoot,
      }),
    )
  }
}
