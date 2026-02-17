import type { HdcManagerConnectionProtocol } from '../frontend/interfaces/hdc-connection-protocol'
import { ExtensionLogger } from '@arkts/shared/vscode'
import { Autowired, Service } from 'unioc'
import { Disposable, ExtensionContext, IOnActivate } from 'unioc/vscode'
import * as vscode from 'vscode'
import { WebviewContext } from '../context/webview-context'
import { HdcServerFunctionImpl } from '../frontend/functions/hdc-server-function'

@Service
@Disposable
export class HdcManagerView extends WebviewContext<HdcManagerConnectionProtocol.ClientFunction, HdcManagerConnectionProtocol.ServerFunction> implements IOnActivate, vscode.WebviewViewProvider {
  @Autowired(ExtensionContext)
  private readonly extensionContext: ExtensionContext

  @Autowired
  private readonly serverFunction: HdcServerFunctionImpl

  @Autowired
  protected readonly logger: ExtensionLogger

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
      enableCommandUris: true,
      enableForms: true,
    }
    this.logger.getConsola().info('HdcManagerView resolved.')
    super.attachWebview(webviewView, this.extensionContext.extensionUri, 'hdc-manager.html', this.serverFunction, '/hdc-manager')
  }

  async onActivate(context: vscode.ExtensionContext): Promise<void> {
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider('ets.hdcManager', this, {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }),
    )
    this.logger.getConsola().info('HdcManagerView activated.')
  }
}
