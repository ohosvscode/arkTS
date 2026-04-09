import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: {
      index: './src/index.ts',
      permission: './src/auth/permission.json',
    },
    outDir: './out',
    format: ['cjs', 'esm'],
    sourcemap: true,
    clean: true,
    shims: true,
    dts: true,
    fixedExtension: false,
    external: ['@ohos-rs/oxk'],
  },
})
