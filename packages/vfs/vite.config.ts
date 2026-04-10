import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: './src/index.ts',
    outDir: './dist',
    format: ['cjs', 'esm'],
    sourcemap: true,
    dts: true,
    clean: true,
    platform: 'neutral',
  },
})
