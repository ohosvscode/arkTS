import type { UserConfig } from 'vite'
import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import autoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import components from 'unplugin-vue-components/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import vueRouter from 'unplugin-vue-router/vite'
import layouts from 'vite-plugin-vue-layouts'
import { InternalTransformHtmlPlugin } from './compiled-html-plugin'

const EXTENSION_ROOT = path.resolve(__dirname, '..')

export async function createViteConfig(projectSourceRoot: string, htmlPath: string, emptyOutDir: boolean = false, dts: boolean = true): Promise<UserConfig> {
  const unoCSS = await import('unocss/vite')

  return {
    plugins: [
      vueRouter({
        dts: dts ? path.resolve(projectSourceRoot, 'typed-router.d.ts') : false,
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
        ],
        dts: dts ? path.resolve(projectSourceRoot, 'auto-imports.d.ts') : false,
      }),
      components({
        dirs: [
          path.resolve(projectSourceRoot, 'components'),
          path.resolve(EXTENSION_ROOT, 'src/components'),
        ],
        dts: dts ? path.resolve(projectSourceRoot, 'components.d.ts') : false,
        resolvers: [
          NaiveUiResolver(),
        ],
      }),
      layouts({
        layoutsDirs: path.resolve(projectSourceRoot, 'layouts'),
        defaultLayout: 'Default',
      }),
      unoCSS.default(),
      InternalTransformHtmlPlugin(),
    ],

    resolve: {
      alias: {
        'path': 'path-browserify',
        'node:path': 'path-browserify',
      },
    },

    base: './',

    build: {
      outDir: path.resolve(EXTENSION_ROOT, 'build'),
      emptyOutDir,
      assetsDir: '.',
      rolldownOptions: {
        input: [
          path.resolve(EXTENSION_ROOT, htmlPath),
        ],
      },
    },
  }
}
