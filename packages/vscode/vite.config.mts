import type { UserConfig } from 'vite-plus'
import type { ViteSSGOptions } from 'vite-ssg'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { setup } from '@css-render/vue3-ssr'
import VueI18n from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import fg from 'fast-glob'
import UnoCSS from 'unocss/vite'
import autoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import components from 'unplugin-vue-components/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import vueRouter from 'unplugin-vue-router/vite'
import layouts from 'vite-plugin-vue-layouts'
import { defineConfig } from 'vite-plus'
import { transformHtmlString } from './scripts/compiled-html-plugin'

const EXTENSION_ROOT = __dirname
const PROJECT_SOURCE_ROOT = path.resolve(EXTENSION_ROOT, 'src', 'frontend')
const NLS_FILES = fg.sync(['package.nls.json', 'package.nls.*.json'], { cwd: EXTENSION_ROOT })
const NLS_CACHE_DIR = path.resolve(EXTENSION_ROOT, 'node_modules', '.cache', 'vue-i18n', 'locales')
const NLS_CACHE_GLOB = path.resolve(NLS_CACHE_DIR, '**')
const __DEV__ = process.argv.includes('--watch')

if (process.env.NODE_ENV !== 'test') {
  console.warn(`NLS_CACHE_GLOB: ${NLS_CACHE_GLOB}`)

  for (const nlsFilePath of NLS_FILES) {
    if (!fs.existsSync(NLS_CACHE_DIR)) fs.mkdirSync(NLS_CACHE_DIR, { recursive: true })
    const basePath = path.basename(nlsFilePath)
    const locale = basePath.match(/package\.nls\.([-\w]*)\.json$/)?.[1] ?? 'en'
    fs.copyFileSync(nlsFilePath, path.resolve(NLS_CACHE_DIR, `${locale}.json`))
  }
}

export default defineConfig({
  plugins: [
    vueRouter({
      dts: path.resolve(PROJECT_SOURCE_ROOT, 'typed-router.d.ts'),
      routesFolder: path.resolve(PROJECT_SOURCE_ROOT, 'pages'),
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
        path.resolve(PROJECT_SOURCE_ROOT, 'composables'),
        path.resolve(PROJECT_SOURCE_ROOT, 'functions'),
        path.resolve(PROJECT_SOURCE_ROOT, 'connections'),
      ],
      dts: path.resolve(PROJECT_SOURCE_ROOT, 'auto-imports.d.ts'),
    }),
    components({
      dirs: [
        path.resolve(PROJECT_SOURCE_ROOT, 'components'),
      ],
      dts: path.resolve(PROJECT_SOURCE_ROOT, 'components.d.ts'),
      resolvers: [
        NaiveUiResolver(),
      ],
    }),
    layouts({
      layoutsDirs: path.resolve(PROJECT_SOURCE_ROOT, 'layouts'),
      defaultLayout: 'Default',
    }),
    VueI18n({
      runtimeOnly: true,
      compositionOnly: true,
      fullInstall: true,
      strictMessage: false,
      include: [NLS_CACHE_GLOB],
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
    script: 'async',
    formatting: 'minify',
    beastiesOptions: {
      reduceInlineStyles: false,
    },
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
    onFinished() {
      console.warn(`[vite-ssg] Removing NLS cache: ${NLS_CACHE_DIR}`)
      fs.rmSync(NLS_CACHE_DIR, { recursive: true, force: true })
    },
  },

  pack: {
    entry: {
      'dist/client': './src/extension.ts',
      'dist/server': '../language-server/src/index.ts',
      'dist/proxy-server': '../language-server/src/proxy-server.ts',
      'node_modules/ets-typescript-plugin/index': '../typescript-plugin/src/index.ts',
    },
    format: 'cjs',
    sourcemap: __DEV__,
    external: ['vscode', '@aws-sdk/client-s3', '@arkts/project-detector', '@ohos-rs/oxk'],
    tsconfig: './tsconfig.json',
    clean: false,
    outDir: '.',
    minify: {
      compress: {
        keepNames: {
          function: true,
          class: true,
        },
      },
      mangle: {
        keepNames: {
          function: true,
          class: true,
        },
      },
    },
    fixedExtension: false,
    inputOptions: {
      checks: {
        eval: false,
        emptyImportMeta: false,
      },
    },
    outputOptions: {
      chunkFileNames: chunk => chunk.isEntry ? '[name]-[hash].js' : 'dist/[name]-[hash].js',
    },
    dts: false,
    alias: {
      '@arkts/shared': path.join(process.cwd(), '../shared/src/index.ts'),
      '@arkts/shared/vscode': path.join(process.cwd(), '../shared/src/vscode.ts'),
      '@arkts/language-plugin': path.join(process.cwd(), '../language-plugin/src/index.ts'),
      '@arkts/sdk-downloader': path.join(process.cwd(), '../../node_modules/@arkts/sdk-downloader/dist/index.js'),
      '@arkts/language-service': path.join(process.cwd(), '../language-service/src/index.ts'),
      '@arkts/types': path.join(process.cwd(), '../types/src/index.ts'),
    },
    watch: __DEV__
      ? [
          './src',
          './scripts',
          '../language-server/src',
          '../typescript-plugin/src',
          '../language-plugin/src',
          '../language-service/src',
          '../shared/src',
        ].map(p => path.join(process.cwd(), p))
      : false,
    ignoreWatch: [/\.d\.ts$/],
    plugins: [
      {
        name: 'umd2esm',
        resolveId: {
          filter: {
            id: /^(vscode-.*-languageservice|vscode-languageserver-types|jsonc-parser)$/,
          },
          handler(path, importer) {
            const pathUmdMay = require.resolve(path, { paths: [importer!] })
            // Call twice the replace is to solve the problem of the path in Windows
            let pathEsm = pathUmdMay
              .replace('/umd/', '/esm/')
              .replace('\\umd\\', '\\esm\\')

            if (pathEsm.includes('vscode-uri')) {
              pathEsm = pathEsm
                .replace('/esm/index.js', '/esm/index.mjs')
                .replace('\\esm\\index.js', '\\esm\\index.mjs')
            }

            return { id: pathEsm }
          },
        },
      },
    ],
    copy: [
      ...fg.sync(['../../ohos-typescript/lib/**/diagnosticMessages.generated.json'], { absolute: true }).map((from) => {
        const splitFromPath = from.split(/[/\\]/)
        const endPath = `${splitFromPath[splitFromPath.length - 3]}${path.sep}${splitFromPath[splitFromPath.length - 2]}${path.sep}${splitFromPath[splitFromPath.length - 1]}`
        const to = path.resolve('dist', path.dirname(endPath))
        return { from, to }
      }),
      ...fg.sync(['../../ohos-typescript/lib/*.d.ts'], { absolute: true })
        .filter(filePath => !path.basename(filePath).includes('dom') && path.basename(filePath) !== 'typescript.d.ts' && !path.basename(filePath).includes('tsserverlibrary') && !path.basename(filePath).includes('webworker'))
        .map((from) => {
        // fast-glob returns POSIX-style paths (/) on Windows, so split by both separators
          const splitFromPath = from.split(/[/\\]/)
          const endPath = `${splitFromPath[splitFromPath.length - 2]}${path.sep}${splitFromPath[splitFromPath.length - 1]}`
          const to = path.resolve('dist', path.dirname(endPath))
          return { from, to }
        }),
    ],
  },
} as UserConfig & { ssgOptions?: ViteSSGOptions })
