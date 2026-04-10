import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: './src/index.ts',
    outDir: './out',
    format: ['cjs', 'esm'],
    sourcemap: true,
    dts: true,
    clean: true,
    external: [],
    noExternal: [],
    shims: true,
    fixedExtension: false,
  },
})
