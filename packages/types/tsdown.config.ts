import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: './src/*.ts',
  outDir: './out',
  format: ['cjs', 'esm'],
  sourcemap: true,
  clean: true,
  shims: true,
  fixedExtension: false,
})
