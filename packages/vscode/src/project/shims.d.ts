/// <reference types="vite/client" />
/// <reference types="vite-plugin-vue-layouts/client" />
/// <reference types="unplugin-vue-router/client" />

declare global {
  function acquireVsCodeApi(): vscode
  interface vscode {
    postMessage(message: unknown): void
  }

  interface Window {
    /** Global vscode protocol API. */
    vscode: vscode
    /** Global birpc connection API. */
    connection: import('birpc').BirpcReturn<import('./interfaces/connection-protocol').ProjectConnectionProtocol.ServerFunction, import('./interfaces/connection-protocol').ProjectConnectionProtocol.ClientFunction>
  }
}

export {}
