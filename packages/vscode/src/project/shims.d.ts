/// <reference types="vite/client" />
/// <reference types="vite-plugin-vue-layouts/client" />
/// <reference types="unplugin-vue-router/client" />

declare global {
  interface Window {
    /** Global birpc connection API. */
    connection: import('birpc').BirpcReturn<import('./interfaces/connection-protocol').ProjectConnectionProtocol.ServerFunction, import('./interfaces/connection-protocol').ProjectConnectionProtocol.ClientFunction>
  }
}

export {}
