import { ExtensionLogger } from '@arkts/shared/vscode'
import { Autowired } from 'unioc'
import { Command } from 'unioc/vscode'
import { FileSystemContext } from '../../context/file-system-context'
import { WebviewPanelContext } from '../../context/webview-panel-context'
import { ProjectServerFunctionImpl } from '../functions/project-server-function'
import { ProjectConnectionProtocol } from '../interfaces/project-connection-protocol'

@Command('ets.createProject')
export class CreateProjectCommand extends WebviewPanelContext<ProjectConnectionProtocol.ClientFunction, ProjectConnectionProtocol.ServerFunction> implements Command {
  @Autowired protected readonly serverFunction: ProjectServerFunctionImpl
  @Autowired protected readonly logger: ExtensionLogger
  @Autowired protected readonly fsx: FileSystemContext

  constructor() {
    super('project.html', 'ets-create-project-view', 'ETS Create Project', '/project')
  }

  onExecuteCommand(): void {
    super.createWebviewPanel()
  }
}
