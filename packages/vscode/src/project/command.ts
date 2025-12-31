import { Autowired } from 'unioc'
import { Command, IOnActivate } from 'unioc/vscode'
import { WebviewContext } from '../context/webview-context'
import { ProjectConnectionProtocol } from './interfaces/connection-protocol'
import { ServerFunctionImpl } from './server-function'

@Command('ets.createProject')
export class CreateProjectCommand extends WebviewContext<ProjectConnectionProtocol.ClientFunction, ProjectConnectionProtocol.ServerFunction> implements Command, IOnActivate {
  @Autowired
  protected readonly serverFunction: ServerFunctionImpl

  constructor() {
    super('project.html', 'ets-create-project-view', 'ETS Create Project')
  }

  onExecuteCommand(): void {
    super.createWebviewPanel()
  }
}
