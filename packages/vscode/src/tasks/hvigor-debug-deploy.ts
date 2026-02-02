import { execSync } from 'node:child_process'
import { Autowired } from 'unioc'
import { TaskProvider, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import which from 'which'
import { HdcManager } from '../hdc-manager'

@TaskProvider('hvigor-debug-deploy')
export class HvigorDebugDeployTaskProvider implements TaskProvider {
  @Autowired(Translator)
  private readonly translator: Translator

  @Autowired
  private readonly hdcManager: HdcManager

  getHvigorPath(): string | null {
    return which.sync('hvigorw', { nothrow: true }) ?? which.sync('hvigor', { nothrow: true })
  }

  getHvigorArgs(deviceType: string, task?: vscode.TaskDefinition): string[] {
    return [
      '--mode module',
      `-p module=${task?.moduleName}@${task?.productName}`,
      `-p product=${task?.productName}`,
      `-p requiredDeviceType=${task?.requiredDeviceType ?? deviceType}`,
      'assembleHap',
      `--analyze=${task?.analyze ?? 'normal'}`,
      task?.parallel === true || task?.parallel === undefined ? '--parallel' : '',
      task?.incremental === true || task?.incremental === undefined ? '--incremental' : '',
      task?.daemon === true || task?.daemon === undefined ? '--daemon' : '',
      ...(task?.args ?? []),
    ].filter(Boolean)
  }

  provideTasks(): vscode.Task[] {
    return [
      new vscode.Task(
        { type: 'hvigor-debug-deploy' },
        vscode.TaskScope.Workspace,
        'Hvigor Debug Deploy',
        'hvigor-debug-deploy',
      ),
    ]
  }

  createExitTask(taskDefinition: vscode.TaskDefinition, message: string): vscode.Task {
    return new vscode.Task(
      taskDefinition,
      vscode.TaskScope.Workspace,
      'Hvigor Debug Deploy',
      'hvigor-debug-deploy',
      new vscode.CustomExecution(async () => {
        const closeEmitter = new vscode.EventEmitter<number>()
        const writeEmitter = new vscode.EventEmitter<string>()

        return {
          close: () => closeEmitter.dispose(),
          onDidWrite: writeEmitter.event,
          onDidClose: closeEmitter.event,
          open: async () => {
            writeEmitter.fire(message)
            closeEmitter.fire(1)
          },
        }
      }),
    )
  }

  async resolveTask(task: vscode.Task): Promise<vscode.Task | undefined> {
    if (task.definition.type !== 'hvigor-debug-deploy') return

    const hdcPath = this.hdcManager.getHdcPath()
    if (!hdcPath) return this.createExitTask(task.definition, this.translator.t('tasks.error.hdcNotFoundInSystemEnvironmentVariables'))

    const hvigorPath = this.getHvigorPath()
    if (!hvigorPath) return this.createExitTask(task.definition, this.translator.t('tasks.error.hvigorNotFoundInSystemEnvironmentVariables'))

    const deviceType = execSync(`${hdcPath} shell param get "const.product.devicetype"`, { encoding: 'utf-8' }).trim()
    if (deviceType.includes('Fail')) return this.createExitTask(task.definition, this.translator.t('tasks.error.deviceNotConnected'))

    return new vscode.Task(
      task.definition,
      vscode.TaskScope.Workspace,
      'Hvigor Debug Deploy',
      'hvigor-debug-deploy',
      new vscode.ProcessExecution(hvigorPath, this.getHvigorArgs(deviceType, task.definition)),
    )
  }
}
