import * as vscode from 'vscode'

const ANSI_GREEN = '\x1B[32m'
const ANSI_BLUE = '\x1B[34m'
const ANSI_RESET = '\x1B[0m'

export abstract class TaskContext {
  protected log(message: string, isNoCommand: boolean = true): string {
    if (!isNoCommand) return `${ANSI_BLUE}[${new Date().toISOString()}] $ ${message}${ANSI_RESET}\r\n`
    return `${ANSI_GREEN}[${new Date().toISOString()}] ${message}${ANSI_RESET}\r\n`
  }

  protected createExitTask(task: vscode.Task, message: string): vscode.Task {
    return new vscode.Task(
      task.definition,
      task.scope ?? vscode.TaskScope.Workspace,
      task.name,
      task.definition.type,
      new vscode.CustomExecution(async () => {
        const closeEmitter = new vscode.EventEmitter<void | number>()
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
}
