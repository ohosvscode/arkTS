/**
 * OpenHarmony kit barrels (e.g. `@kit.AbilityKit`) re-export symbols from
 * `@ohos.*` / `@arkts.*` modules. Those modules may live in nested folders
 * under `ets/api`, `ets/kits`, or `ets/arkts` while imports still use dotted
 * specifiers. Wildcard `paths['*']` alone does not index those files, so
 * jump-to-definition and exported member types stay unresolved.
 */

export function stripDeclarationExtension(fileName: string): string {
  return fileName
    .replace(/\\/g, '/')
    .replace(/\.d\.ets$/i, '')
    .replace(/\.d\.ts$/i, '')
}

/**
 * Module specifiers for one OpenHarmony declaration file, relative to
 * `ets/api`, `ets/kits`, or `ets/arkts`.
 *
 * `api/@ohos.app.ability/UIAbility.d.ts` yields both
 * `@ohos.app.ability/UIAbility` and `@ohos.app.ability.UIAbility`.
 */
export function ohosDeclarationToModuleNames(relativePath: string): string[] {
  const moduleName = stripDeclarationExtension(relativePath)
  const posixRelative = relativePath.replace(/\\/g, '/')
  if (!moduleName || moduleName === posixRelative) return []

  const names = new Set<string>([moduleName])
  if (moduleName.includes('/')) names.add(moduleName.replaceAll('/', '.'))
  return [...names]
}

export function addOhosPathMapping(
  paths: Record<string, string[]>,
  moduleName: string,
  filePath: string,
  wildcardTarget: string,
): void {
  const existing = paths[moduleName]
  if (!existing) paths[moduleName] = [filePath]
  else if (!existing.includes(filePath)) existing.push(filePath)

  paths[`${moduleName}/*`] = [wildcardTarget]
}
