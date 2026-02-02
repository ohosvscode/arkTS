import type { UserConfig } from 'vite'
import type { ViteSSGOptions } from 'vite-ssg'
import path from 'node:path'
import { setup } from '@css-render/vue3-ssr'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import UnoCSS from 'unocss/vite'
import autoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import components from 'unplugin-vue-components/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import vueRouter from 'unplugin-vue-router/vite'
import { defineConfig } from 'vite'
import layouts from 'vite-plugin-vue-layouts'
import { transformHtmlString } from './scripts/compiled-html-plugin'

const EXTENSION_ROOT = __dirname
const projectSourceRoot = path.resolve(EXTENSION_ROOT, 'src', 'frontend')

export default defineConfig({
  plugins: [
    vueRouter({
      dts: path.resolve(projectSourceRoot, 'typed-router.d.ts'),
      routesFolder: path.resolve(projectSourceRoot, 'pages'),
    }),
    vue(),
    vueJsx(),
    autoImport({
      imports: [
        'vue',
        '@vueuse/core',
        'vue-i18n',
        VueRouterAutoImports,
      ],
      dirs: [
        path.resolve(projectSourceRoot, 'composables'),
        path.resolve(projectSourceRoot, 'functions'),
      ],
      dts: path.resolve(projectSourceRoot, 'auto-imports.d.ts'),
    }),
    components({
      dirs: [
        path.resolve(projectSourceRoot, 'components'),
      ],
      dts: path.resolve(projectSourceRoot, 'components.d.ts'),
      resolvers: [
        NaiveUiResolver(),
      ],
    }),
    layouts({
      layoutsDirs: path.resolve(projectSourceRoot, 'layouts'),
      defaultLayout: 'Default',
    }),
    UnoCSS(),
  ],

  resolve: {
    alias: {
      'path': 'path-browserify',
      'node:path': 'path-browserify',
    },
  },

  build: {
    outDir: 'build',
    assetsDir: '.',
  },

  base: './',

  ssr: {
    noExternal: ['naive-ui', 'vueuc', 'date-fns'],
  },

  ssgOptions: {
    entry: 'src/frontend/main.ts',
    async onBeforePageRender(_, __, appCtx) {
      const { collect } = setup(appCtx.app)
      ;(appCtx as any).__collectStyle = collect
      return undefined
    },
    async onPageRendered(_, renderedHTML, appCtx) {
      const cssedHTML = renderedHTML.replace(
        /<\/head>/,
        `${(appCtx as any).__collectStyle()}</head>`,
      )
      return transformHtmlString(cssedHTML)
    },
  },
} as UserConfig & { ssgOptions?: ViteSSGOptions })
