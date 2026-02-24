import { ExtensionLogger } from '@arkts/shared/vscode'
import { Autowired } from 'unioc'
import { Command } from 'unioc/vscode'
import { FileSystemContext } from '../../context/file-system-context'
import { WebviewPanelContext } from '../../context/webview-panel-context'
import { DeviceManagerFunctionImpl } from '../functions/device-manager-function'
import { DeviceManagerProtocol } from '../interfaces/device-manager-protocol'

@Command('ets.openDeviceManager')
export class OpenHdcManagerCommand extends WebviewPanelContext<DeviceManagerProtocol.ClientFunction, DeviceManagerProtocol.ServerFunction> implements Command {
  @Autowired protected readonly serverFunction: DeviceManagerFunctionImpl
  @Autowired protected readonly logger: ExtensionLogger
  @Autowired protected readonly fsx: FileSystemContext

  constructor() {
    super('device-manager.html', 'ets.deviceManager', 'ETS Device Manager', '/device-manager')
  }

  onExecuteCommand(): void {
    super.createWebviewPanel()
  }
}
