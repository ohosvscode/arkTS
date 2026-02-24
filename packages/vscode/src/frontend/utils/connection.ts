import type { BirpcReturn } from 'birpc'
import type { Router } from 'vue-router'
import type { WebviewContext } from '../../context/webview-context'
import { createBirpc } from 'birpc'

export interface Connection<RemoteFunctions = Record<string, never>, LocalFunctions extends WebviewContext.ClientFunction = WebviewContext.ClientFunction> {
  connection: BirpcReturn<RemoteFunctions, LocalFunctions>
  onDidChangeActiveColorTheme(callback: () => void): void
}

export function createConnection<RemoteFunctions = Record<string, never>, LocalFunctions extends WebviewContext.ClientFunction = WebviewContext.ClientFunction>(localFunctions: WebviewContext.PartialClientFunction<LocalFunctions> = {} as LocalFunctions): Connection<RemoteFunctions, LocalFunctions> {
  const onDidChangeActiveColorThemeCallbacks = new Set<() => void>()
  const onDidChangeActiveColorTheme = (callback: () => void): void => {
    onDidChangeActiveColorThemeCallbacks.add(callback)
  }

  const connection = createBirpc<RemoteFunctions, LocalFunctions>({
    ...localFunctions,
    onDidChangeActiveColorTheme: () => onDidChangeActiveColorThemeCallbacks.forEach(callback => callback()),
  } as LocalFunctions, {
    on: fn => globalThis?.window?.addEventListener('message', msg => fn(msg.data)),
    post: data => globalThis.window?.vscode?.postMessage(data),
    serialize: data => JSON.stringify(data),
    deserialize: data => JSON.parse(data),
    timeout: typeof window === 'undefined' ? 0 : undefined,
    onFunctionError: (error, functionName, functionArgs) => {
      console.error('Error in createConnection onFunctionError, functionName: ', functionName, 'functionArgs: ', functionArgs)
      console.error(error)
    },
  })

  return {
    connection,
    onDidChangeActiveColorTheme,
  }
}

export function useConnection(router: Router = useRouter()): ReturnType<typeof useProjectConnection> | ReturnType<typeof useHdcConnection> | ReturnType<typeof useDeviceManagerConnection> | ReturnType<typeof useQualifierEditorConnection> | undefined {
  if (router.currentRoute.value.path.startsWith('/project')) return useProjectConnection()
  else if (router.currentRoute.value.path.startsWith('/hdc-manager')) return useHdcConnection()
  else if (router.currentRoute.value.path.startsWith('/device-manager')) return useDeviceManagerConnection()
  else if (router.currentRoute.value.path.startsWith('/qualifier-editor')) return useQualifierEditorConnection()
  else return undefined
}
