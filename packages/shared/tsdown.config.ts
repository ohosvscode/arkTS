import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts', './src/vscode.ts'],
  outDir: './out',
  format: ['cjs', 'esm'],
  dts: {
    sourcemap: false,
  },
  clean: true,
  external: ['vscode'],
  shims: true,
  fixedExtension: false,
})
