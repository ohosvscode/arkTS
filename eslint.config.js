import naily from 'naily-eslint-config'

export default naily({
  type: 'lib',
  freedom: true,
  pnpm: false,
  ignores: [
    'ohos-typescript/**/*',
    'sample/**/*',
    'packages/declarations/ets/**/*',
    'packages/vscode/src/generated/**/*',
    'packages/vfs/src/**/*',
    'packages/language-server/language-server-demo/*',
    'test-*.mjs',
    'test-*.cjs',
    'e2e/apps/**/*',
  ],
  typescript: {
    parserOptions: {
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
    },
  },
  rules: {
    'vue/singleline-html-element-content-newline': 'off',
  },
})
