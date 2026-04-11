import { Uri } from '@vstils/core'

/**
 * Patch the ohos-typescript's `resolveModuleName` to support `allowTsExtension` in TypeScript 5.x.
 *
 * @param ets - The ETS instance.
 */
export function patchResolver(ets: typeof import('ohos-typescript')): void {
  const oldResolveModuleName = ets.resolveModuleName
  ets.resolveModuleName = (...args) => {
    const res = oldResolveModuleName(...args as Parameters<typeof ets.resolveModuleName>)
    if (args[0].endsWith('.d.ts')) return res
    if (!args[0].endsWith('.ts')) return res
    const resolvedFileName = Uri.joinPath(Uri.dirname(Uri.file(args[1])), args[0]).fsPath
    if (!args[3].fileExists(resolvedFileName)) return res
    return {
      resolvedModule: {
        resolvedFileName,
        extension: ets.Extension.Ts,
      },
    }
  }
}
