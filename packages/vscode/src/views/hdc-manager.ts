import type { HdcManagerConnectionProtocol } from '../frontend/interfaces/hdc-connection-protocol'
import { ExtensionLogger } from '@arkts/shared/vscode'
import { Autowired, Service } from 'unioc'
import { Disposable, ExtensionContext, IOnActivate } from 'unioc/vscode'
import * as vscode from 'vscode'
import { FileSystemContext } from '../context/file-system-context'
import { WebviewContext } from '../context/webview-context'
import { HdcServerFunctionImpl } from '../frontend/functions/hdc-server-function'

@Service
@Disposable
export class HdcManagerView extends WebviewContext<HdcManagerConnectionProtocol.ClientFunction, HdcManagerConnectionProtocol.ServerFunction> implements IOnActivate, vscode.WebviewViewProvider {
  @Autowired(ExtensionContext) private readonly extensionContext: ExtensionContext
  @Autowired private readonly serverFunction: HdcServerFunctionImpl
  @Autowired protected readonly logger: ExtensionLogger
  @Autowired protected readonly fsx: FileSystemContext

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    webviewView.webview.options = {
      enableScripts: true,
      enableCommandUris: true,
      enableForms: true,
    }
    this.logger.getConsola().info('HdcManagerView resolved.')
    await super.attachWebview({
      webviewContainer: webviewView,
      extensionUri: this.extensionContext.extensionUri,
      htmlName: 'hdc-manager.html',
      serverFunction: this.serverFunction,
      initialURL: '/hdc-manager',
    })
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
