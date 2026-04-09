import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
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
  },
})
