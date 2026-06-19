import { defineConfig } from 'vite-plus'
import typescriptPluginPackageJson from './arkts-typescript-plugin/package.json'

export default defineConfig({
  staged: {
    '*': 'eslint . --fix',
  },

  pack: [
    {
      name: '@arkts/language-server',
      entry: [
        'arkts-language-server/src/node.ts',
        'arkts-language-server/src/browser.ts',
        'arkts-language-server/src/index.ts',
      ],
      outDir: 'arkts-language-server/dist',
      format: 'esm',
      platform: 'node',
      shims: true,
      dts: true,
      checks: {
        eval: false,
        importIsUndefined: false,
      },
      deps: {
        onlyBundle: false,
      },
      copy: [
        { from: 'arkts-ohos-typescript/lib/**/diagnosticMessages.generated.json', flatten: false },
        {
          from: [
            'arkts-ohos-typescript/lib/*.d.ts',
            '!**/typescript.d.ts',
            '!**/tsserverlibrary.d.ts',
            '!**/lib.webworker.d.ts',
            '!**/lib.webworker.*.d.ts',
            '!**/lib.dom.d.ts',
            '!**/lib.dom.*.d.ts',
          ],
          flatten: false,
        },
      ],
    },
    {
      name: '@arkts/typescript-plugin',
      entry: 'arkts-typescript-plugin/src/index.ts',
      outDir: 'arkts-typescript-plugin/dist',
      format: 'esm',
      platform: 'node',
      shims: true,
      dts: true,
      deps: {
        neverBundle: Object.keys(typescriptPluginPackageJson.dependencies).map(k => new RegExp(`^${k}`)).concat(/^typescript/),
      },
    },
    {
      name: 'arkts-language-server -> NailyZero.vscode-naily-ets',
      entry: {
        'arkts-server-node': 'arkts-language-server/src/node.ts',
        'arkts-server-browser': 'arkts-language-server/src/browser.ts',
      },
      outDir: 'arkts-vscode-language-features/dist',
      format: 'cjs',
      dts: false,
      minify: true,
      outExtensions: ctx => ctx.format === 'cjs' ? { js: '.js' } : undefined,
      deps: {
        onlyBundle: false,
      },
      checks: {
        eval: false,
      },
      copy: [
        { from: 'arkts-ohos-typescript/lib/**/diagnosticMessages.generated.json', flatten: false },
        {
          from: [
            'arkts-ohos-typescript/lib/*.d.ts',
            '!**/typescript.d.ts',
            '!**/tsserverlibrary.d.ts',
            '!**/lib.webworker.d.ts',
            '!**/lib.webworker.*.d.ts',
            '!**/lib.dom.d.ts',
            '!**/lib.dom.*.d.ts',
          ],
          flatten: false,
        },
      ],
    },
    {
      name: 'NailyZero.vscode-naily-ets',
      entry: {
        'dist/browser': 'arkts-vscode-language-features/src/browser.ts',
        'dist/node': 'arkts-vscode-language-features/src/node.ts',
        'node_modules/ets-typescript-plugin/index': 'arkts-typescript-plugin/src/index.ts',
      },
      outDir: 'arkts-vscode-language-features',
      format: 'cjs',
      minify: true,
      dts: false,
      clean: false,
      outExtensions: ctx => ctx.format === 'cjs' ? { js: '.js' } : undefined,
      deps: {
        neverBundle: ['vscode'],
        onlyBundle: false,
      },
      outputOptions: {
        chunkFileNames: 'dist/[name]-[hash].js',
      },
    },
  ],
})
