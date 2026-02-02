import { ExtensionLogger } from '@arkts/shared/vscode'
import { Autowired, Service } from 'unioc'
import { WebviewPanelContext } from '../../context/webview-panel-context'
import { QualifierEditorServerFunctionImpl } from '../functions/qualifier-editor-server-function'
import { QualifierEditorConnectionProtocol } from '../interfaces/qualifier-editor-connection-protocol'

@Service
export class QualifierEditorWebviewPanel extends WebviewPanelContext<QualifierEditorConnectionProtocol.ClientFunction, QualifierEditorConnectionProtocol.ServerFunction> {
  @Autowired
  public readonly serverFunction: QualifierEditorServerFunctionImpl

  @Autowired
  protected readonly logger: ExtensionLogger

  constructor() {
    super('qualifier-editor.html', 'ets-qualifier-editor-view', 'Create Resource Qualifier Directory', '/qualifier-editor')
  }
}
