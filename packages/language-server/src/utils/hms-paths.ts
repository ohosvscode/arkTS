/**
 * HMS kit barrels (e.g. `@kit.UIDesignKit`) re-export symbols such as
 * `HdsNavigation` / `HdsNavigationAttribute` (which declare `.titleBar`)
 * from `@hms.*` modules. Those modules may live in nested folders while
 * imports still use dotted specifiers.
 */

export function stripDeclarationExtension(fileName: string): string {
  return fileName
    .replace(/\\/g, '/')
    .replace(/\.d\.ets$/i, '')
    .replace(/\.d\.ts$/i, '')
}

/**
 * Module specifiers for one HMS declaration file, relative to `ets/api`,
 * `ets/kits`, or `ets/arkts`.
 *
 * `api/@hms.core.uidesign/titleBar.d.ts` yields both
 * `@hms.core.uidesign/titleBar` and `@hms.core.uidesign.titleBar`.
 */
export function hmsDeclarationToModuleNames(relativePath: string): string[] {
  const moduleName = stripDeclarationExtension(relativePath)
  const posixRelative = relativePath.replace(/\\/g, '/')
  if (!moduleName || moduleName === posixRelative)
    return []

  const names = new Set<string>([moduleName])
  if (moduleName.includes('/'))
    names.add(moduleName.replaceAll('/', '.'))
  return [...names]
}

export function addHmsPathMapping(
  paths: Record<string, string[]>,
  moduleName: string,
  filePath: string,
  wildcardTarget: string,
): void {
  const existing = paths[moduleName]
  if (!existing)
    paths[moduleName] = [filePath]
  else if (!existing.includes(filePath))
    existing.push(filePath)

  paths[`${moduleName}/*`] = [wildcardTarget]
}

export function hmsEtsWildcardTargets(hmsEtsPath: string): string[] {
  const normalized = hmsEtsPath.replace(/\\/g, '/')
  return ['api', 'kits', 'arkts'].map(dir => `${normalized}/${dir}/*`)
}
