declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, any>
  export default component
}

declare function acquireVsCodeApi(): vscode

declare interface vscode {
  postMessage(message: unknown): void
  setState(state: vscode.State): void
  getState(): vscode.State
}

declare namespace vscode {
  interface State {
  }
}

declare interface Window {
  vscode?: vscode
  INITIAL_URL?: string
}
