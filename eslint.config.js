import antfu from '@antfu/eslint-config'
import ifOnelineRule from './scripts/if-oneline.js'

export default antfu({
  type: 'lib',
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
  rules: {
    'ts/no-namespace': 'off',
    'ts/method-signature-style': ['error', 'method'],
    'antfu/if-newline': 'off',
    'naily/if-oneline': 'error',
    'ts/no-redeclare': 'off',
    'vue/singleline-html-element-content-newline': 'off',
  },
  plugins: {
    naily: {
      rules: {
        'if-oneline': ifOnelineRule,
      },
    },
  },
  typescript: {
    parserOptions: {
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
    },
  },
  pnpm: false,
})
