import { Autowired, Service } from 'unioc'
import { IOnActivate } from 'unioc/vscode'
import { WebviewContext } from '../context/webview-context'
import { QualifierEditorConnectionProtocol } from './interfaces/connection-protocol'
import { QualifierEditorServerFunctionImpl } from './server-function'

@Service
export class QualifierEditorWebviewPanel extends WebviewContext<QualifierEditorConnectionProtocol.ClientFunction, QualifierEditorConnectionProtocol.ServerFunction> implements IOnActivate {
  @Autowired
  protected readonly serverFunction: QualifierEditorServerFunctionImpl

  constructor() {
    super('qualifier-editor.html', 'ets-qualifier-editor-view', 'Create Resource Qualifier Directory')
  }
}
