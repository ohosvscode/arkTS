import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: './src/index.ts',
    outDir: './out',
    format: ['cjs', 'esm'],
    sourcemap: true,
    dts: true,
    clean: true,
    shims: true,
    tsconfig: './tsconfig.build.json',
    fixedExtension: false,
    deps: {
      neverBundle: ['typescript', 'ohos-typescript'],
    },
  },
})
