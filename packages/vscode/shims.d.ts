declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, any>
  export default component
}

declare function acquireVsCodeApi(): vscode

declare interface vscode {
  postMessage(message: unknown): void
}

declare interface Window {
  vscode: vscode
}
