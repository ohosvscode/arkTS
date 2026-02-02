import { ExtensionLogger } from '@arkts/shared/vscode'
import { Autowired } from 'unioc'
import { Command } from 'unioc/vscode'
import { WebviewPanelContext } from '../../context/webview-panel-context'
import { HdcServerFunctionImpl } from '../functions/hdc-server-function'
import { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'

@Command('ets.openHdcManager')
export class OpenHdcManagerCommand extends WebviewPanelContext<HdcManagerConnectionProtocol.ClientFunction, HdcManagerConnectionProtocol.ServerFunction> implements Command {
  @Autowired
  protected readonly serverFunction: HdcServerFunctionImpl

  @Autowired
  protected readonly logger: ExtensionLogger

  constructor() {
    super('hdc-manager.html', 'ets.hdcManager', 'ETS HDC Manager', '/device-manager')
  }

  onExecuteCommand(): void {
    super.createWebviewPanel()
  }
}
