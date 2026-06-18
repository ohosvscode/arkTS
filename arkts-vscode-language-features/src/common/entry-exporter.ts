import type { LabsInfo } from '@volar/vscode'
import type * as vscode from 'vscode'
import type { UserInstance, UserModule } from './types'
import { AbstractLanguageServer } from './abstract-language-server'

export interface Extension {
  activate(context: vscode.ExtensionContext): Promise<LabsInfo | undefined>
  deactivate(): Promise<void>
}

export function createExtension(modules: Record<string, { default?: UserModule }>): Extension {
  const instances: UserInstance[] = []

  return {
    activate: async (context) => {
      instances.push(...Object.values(modules).filter(i => i.default).map(i => new i.default!(context)))

      for (const instance of instances) {
        if (instance instanceof AbstractLanguageServer) return instance.start()
      }
    },
    deactivate: async () => {
      for (const instance of instances) {
        if (instance instanceof AbstractLanguageServer) instance.deactivate()
      }
    },
  }
}
