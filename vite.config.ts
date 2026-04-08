import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'eslint --fix',
  },

  test: {
    projects: [
      'packages/*',
      {
        // Root project for e2e tests
        test: {
          include: ['e2e/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
          name: 'e2e',
          globals: true,
        },
      },
    ],
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier,tsdown,uno}.config.*',
      'ohos-typescript/**',
      'sample/**/*',
      './packages/vscode/scripts/**',
      './packages/language-server/bin/**',
    ],
    coverage: {
      exclude: [
        'coverage/**',
        'dist/**',
        '**/dist/**',
        'out/**',
        'scripts/**',
        '**/out/**',
        '**/[.]**',
        'packages/*/test?(s)/**',
        '**/*.d.ts',
        '**/*virtual:*',
        '**/__x00__*',
        '**/\x00*',
        'cypress/**',
        'test?(s)/**',
        'test?(-*).?(c|m)[jt]s?(x)',
        '**/*{.,-}{test,spec}?(-d).?(c|m)[jt]s?(x)',
        '**/*__tests__/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,tsdown,uno,eslint}.config.*',
        '**/*vitest.{workspace,projects}.[jt]s?(on)',
        '**/.{eslint,mocha,prettier}rc.{?(c|m)js,yml}',
        'ohos-typescript/**',
        'sample/**/*',
        './packages/vscode/scripts/**',
        './packages/language-server/bin/**',
      ],
    },
  },
})
