import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: './src/*.ts',
    outDir: './out',
    format: ['cjs', 'esm'],
    sourcemap: true,
    clean: true,
    shims: true,
    fixedExtension: false,
  },
})
