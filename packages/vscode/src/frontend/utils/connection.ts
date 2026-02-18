import type { BirpcReturn } from 'birpc'
import type { WebviewContext } from '../../context/webview-context'
import { createBirpc } from 'birpc'

export function createConnection<RemoteFunctions = Record<string, never>, LocalFunctions extends WebviewContext.ClientFunction = WebviewContext.ClientFunction>(localFunctions: WebviewContext.PartialClientFunction<LocalFunctions> = {} as LocalFunctions): BirpcReturn<Partial<RemoteFunctions>, LocalFunctions> {
  return createBirpc<RemoteFunctions, LocalFunctions>({
    ...localFunctions,
    onDidChangeActiveColorTheme: () => onDidChangeActiveColorTheme.callbacks.forEach(callback => callback()),
  } as LocalFunctions, {
    on: fn => globalThis?.window?.addEventListener('message', msg => fn(msg.data)),
    post: data => globalThis.window?.vscode?.postMessage(data),
    serialize: data => JSON.stringify(data),
    deserialize: data => JSON.parse(data),
    timeout: typeof window === 'undefined' ? 0 : undefined,
  })
}
