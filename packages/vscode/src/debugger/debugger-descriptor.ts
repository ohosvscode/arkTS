import { Autowired } from 'unioc'
import { DebugAdapterDescriptor } from 'unioc/vscode'
import * as vscode from 'vscode'
import { ETSDebuggerAdapter } from './debugger-adapter'

/** @see https://github.com/ohosvscode/debugger */
@DebugAdapterDescriptor('ets')
export class DebugDescriptor implements DebugAdapterDescriptor {
  @Autowired
  private readonly debuggerAdapter: ETSDebuggerAdapter

  createDebugAdapterDescriptor(): vscode.DebugAdapterDescriptor {
    return new vscode.DebugAdapterInlineImplementation(this.debuggerAdapter)
  }
}
