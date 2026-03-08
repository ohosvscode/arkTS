import path from 'node:path'
import fg from 'fast-glob'
import { defineConfig, globalLogger } from 'tsdown'

const OUT_DIR = 'out'

export default defineConfig({
  entry: './src/index.ts',
  outDir: OUT_DIR,
  format: ['cjs', 'esm'],
  sourcemap: true,
  dts: true,
  clean: true,
  shims: true,
  inputOptions: {
    checks: {
      eval: false,
    },
  },
  fixedExtension: false,
  external: ['@ohos-rs/oxk'],
  copy: [
    ...fg.sync(['../../ohos-typescript/lib/**/diagnosticMessages.generated.json'], { absolute: true }).map((from) => {
      const splitFromPath = from.split(path.sep)
      const endPath = `${splitFromPath[splitFromPath.length - 3]}${path.sep}${splitFromPath[splitFromPath.length - 2]}${path.sep}${splitFromPath[splitFromPath.length - 1]}`
      const to = path.resolve(OUT_DIR, endPath)
      globalLogger.info(`COPYING: ${from} -> ${to}`)
      return { from, to }
    }),
    ...fg.sync(['../../ohos-typescript/lib/*.d.ts'], { absolute: true })
      // exclude dom declaration files、typescript.d.ts、tsserverlibrary.d.ts and webworker declaration files
      .filter(filePath => !path.basename(filePath).includes('dom') && path.basename(filePath) !== 'typescript.d.ts' && !path.basename(filePath).includes('tsserverlibrary') && !path.basename(filePath).includes('webworker'))
      .map((from) => {
        const splitFromPath = from.split(path.sep)
        const endPath = `${splitFromPath[splitFromPath.length - 2]}${path.sep}${splitFromPath[splitFromPath.length - 1]}`
        const to = path.resolve(OUT_DIR, endPath)
        globalLogger.info(`COPYING: ${from} -> ${to}`)
        return { from, to }
      }),
  ],
})
