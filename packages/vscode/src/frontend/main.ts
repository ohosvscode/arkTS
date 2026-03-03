import type { RouteRecordRaw } from 'vue-router'
import type { UserModule } from './types'
import { createPinia } from 'pinia'
import { setupLayouts } from 'virtual:generated-layouts'
import { ViteSSG } from 'vite-ssg'
import { routes } from 'vue-router/auto-routes'
import Root from './Root.vue'
import { useConnection } from './utils/connection'
import 'uno.css'

export const createApp = ViteSSG(
  Root,
  {
    routes: setupLayouts(routes as RouteRecordRaw[]),
    base: import.meta.env.BASE_URL,
  },
  async (ctx) => {
    if (globalThis?.window) {
      globalThis.window.vscode = acquireVsCodeApi()
      if (globalThis?.window?.INITIAL_URL) await ctx.router.replace(globalThis.window.INITIAL_URL)
    }
    ctx.app.use(createPinia())
    const { connection } = useConnection(ctx.router) ?? {}
    // install all modules under `modules/`
    const modules = import.meta.glob<{ install: UserModule }>('./modules/*.ts', { eager: true })
    for (const module of Object.values(modules)) {
      await module.install?.(ctx, connection as any)
    }
  },
)
