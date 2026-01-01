import { Autowired, Service } from 'unioc'
import { WebviewContext } from '../context/webview-context'
import { QualifierEditorConnectionProtocol } from './interfaces/connection-protocol'
import { QualifierEditorServerFunctionImpl } from './server-function'

@Service
export class QualifierEditorWebviewPanel extends WebviewContext<QualifierEditorConnectionProtocol.ClientFunction, QualifierEditorConnectionProtocol.ServerFunction> {
  @Autowired
  public readonly serverFunction: QualifierEditorServerFunctionImpl

  constructor() {
    super('qualifier-editor.html', 'ets-qualifier-editor-view', 'Create Resource Qualifier Directory')
  }
}
