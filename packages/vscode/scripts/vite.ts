import type { UserConfig } from 'vite-plus'
import path from 'node:path'
import process from 'node:process'
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

export interface CreateAppViteConfigOptions {
  projectSourceRoot: string
  htmlPath: string
  /** @default false */
  emptyOutDir?: boolean
  /** @default true */
  dts?: boolean
}

export interface CreateCommonViteConfigOptions {
  /** @default true */
  emptyOutDir?: boolean
}

export type CreateViteConfigOptions = CreateAppViteConfigOptions | CreateCommonViteConfigOptions

function isCreateAppViteConfigOptions(options: CreateViteConfigOptions): options is CreateAppViteConfigOptions {
  return 'projectSourceRoot' in options && 'htmlPath' in options
}

export async function createViteConfig(options: CreateAppViteConfigOptions): Promise<UserConfig>
export async function createViteConfig(options: CreateCommonViteConfigOptions): Promise<UserConfig>
export async function createViteConfig(options: CreateViteConfigOptions): Promise<UserConfig> {
  if (isCreateAppViteConfigOptions(options)) return createAppViteConfig(options)
  else return createCommonViteConfig(options)
}

async function createCommonViteConfig({ emptyOutDir = true }: CreateCommonViteConfigOptions = {}): Promise<UserConfig> {
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },

    plugins: [
      vue(),
      vueJsx(),
    ],

    build: {
      outDir: path.resolve(EXTENSION_ROOT, 'build', 'common'),
      emptyOutDir,
      lib: {
        entry: path.resolve(EXTENSION_ROOT, 'src/frontend/common/index.ts'),
        formats: ['es'],
        fileName: 'index',
      },
      ssr: false,
    },
  }
}

async function createAppViteConfig({ projectSourceRoot, htmlPath, emptyOutDir = false, dts = true }: CreateAppViteConfigOptions): Promise<UserConfig> {
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
      assetsDir: process.env.NODE_ENV ? process.env.NODE_ENV : '.',
      rolldownOptions: {
        input: [
          path.resolve(EXTENSION_ROOT, htmlPath),
        ],
      },
    },
  }
}
