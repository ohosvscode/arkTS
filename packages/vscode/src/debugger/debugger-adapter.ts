import type { LaunchRequest } from '@arkts/debugger/vscode'
import type { DebugProtocol } from '@vscode/debugprotocol'
import { VscodeDebuggerAdapter } from '@arkts/debugger/vscode'
import { Service } from 'unioc'

@Service
export class ETSDebuggerAdapter extends VscodeDebuggerAdapter {
  protected async launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequest.Arguments): Promise<void> {
    await super.launchRequest(response, args)
  }
}
