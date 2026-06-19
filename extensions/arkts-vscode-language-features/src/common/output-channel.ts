import * as vscode from 'vscode'

export abstract class BaseOutputChannel implements vscode.Disposable {
  private static channel: vscode.OutputChannel | undefined

  getOutputChannel(): vscode.OutputChannel {
    return BaseOutputChannel.channel ??= vscode.window.createOutputChannel('ArkTS Language Server', {
      log: true,
    })
  }

  dispose(): void {
    BaseOutputChannel.channel?.dispose()
    BaseOutputChannel.channel = undefined
  }
}
