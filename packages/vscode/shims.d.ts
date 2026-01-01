declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, any>
  export default component
}

declare function acquireVsCodeApi(): vscode

declare interface vscode {
  postMessage(message: unknown): void
  setState<T = unknown>(state: T): void
  getState<T = unknown>(): T
}

declare interface Window {
  vscode: vscode
}
