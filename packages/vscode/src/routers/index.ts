import type { RouteRecordRaw } from 'vue-router'
import NProgress from 'nprogress'
import { setupLayouts } from 'virtual:generated-layouts'
import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: setupLayouts(routes as RouteRecordRaw[]),
})

router.beforeEach((to, from) => {
  if (to.path !== from.path) NProgress.start()
})

router.afterEach(() => {
  NProgress.done()
})
