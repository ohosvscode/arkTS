import type { PageRegisterTarget, PageTemplateDefinition } from './page-template'
import path from 'node:path'
import JSON5 from 'json5'
import { normalizePageName, renderPageTemplate } from './page-template'

export interface FileAccess {
  exists: (filePath: string) => boolean
  readFile: (filePath: string) => string | undefined
}

export interface PlannedFileWrite {
  filePath: string
  content: string
}

export interface CreatePagePlan {
  pageFile: PlannedFileWrite
  extraFiles: PlannedFileWrite[]
  registerTarget: PageRegisterTarget
}

const PROFILE_REF_PATTERN = /^\$profile:([0-9A-Za-z_.]+)$/

export function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

export function resolveProfileRef(profileRef: string | undefined, fallbackName: string): string {
  const match = profileRef?.trim().match(PROFILE_REF_PATTERN)
  return match?.[1] ?? fallbackName
}

export function getModuleRoot(moduleJson5Path: string): string {
  const normalized = toPosixPath(moduleJson5Path)
  if (normalized.endsWith('/src/main/module.json5')) return path.dirname(path.dirname(path.dirname(moduleJson5Path)))
  return path.dirname(moduleJson5Path)
}

export function findModuleJson5Path(startDir: string, exists: (filePath: string) => boolean): string | undefined {
  let current = path.resolve(startDir)
  const seen = new Set<string>()

  while (!seen.has(current)) {
    seen.add(current)
    const nested = path.join(current, 'src', 'main', 'module.json5')
    if (exists(nested)) return nested
    const direct = path.join(current, 'module.json5')
    if (exists(direct)) return direct

    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  return undefined
}

export function resolveProfileFilePath(moduleRoot: string, profileName: string, exists: (filePath: string) => boolean): string {
  const profileDir = path.join(moduleRoot, 'src', 'main', 'resources', 'base', 'profile')
  const jsonPath = path.join(profileDir, `${profileName}.json`)
  const json5Path = path.join(profileDir, `${profileName}.json5`)
  if (exists(json5Path) && !exists(jsonPath)) return json5Path
  return jsonPath
}

function readModuleConfig(content: string | undefined): Record<string, unknown> {
  if (!content?.trim()) return { module: {} }
  try {
    const parsed = JSON5.parse(content)
    if (parsed && typeof parsed === 'object' && parsed.module && typeof parsed.module === 'object') return parsed as Record<string, unknown>
  }
  catch {
    // Fall through and treat as empty so page creation can still succeed.
  }
  return { module: {} }
}

function getModuleField(moduleConfig: Record<string, unknown>, field: string): string | undefined {
  const module = moduleConfig.module as Record<string, unknown> | undefined
  const value = module?.[field]
  return typeof value === 'string' ? value : undefined
}

function stringifyJsonLike(filePath: string, value: unknown): string {
  const serialized = toPosixPath(filePath).endsWith('.json5')
    ? JSON5.stringify(value, null, 2)
    : JSON.stringify(value, null, 2)
  return `${serialized}\n`
}

export function getPageRoutePath(etsFilePath: string, moduleRoot: string): string {
  const etsRoot = path.join(moduleRoot, 'src', 'main', 'ets')
  const relative = path.relative(etsRoot, etsFilePath)
  const withoutExt = relative.replace(/\.ets$/i, '')
  if (!relative || relative.startsWith('..')) {
    return `pages/${path.basename(withoutExt)}`
  }
  return toPosixPath(withoutExt)
}

export function getPageSourceFile(etsFilePath: string, moduleRoot: string): string {
  const relative = path.relative(moduleRoot, etsFilePath)
  if (!relative || relative.startsWith('..')) {
    return toPosixPath(path.join('src', 'main', 'ets', 'pages', path.basename(etsFilePath)))
  }
  return toPosixPath(relative)
}

export function appendMainPages(content: string | undefined, routePath: string): string {
  let parsed: { src?: unknown, [key: string]: unknown }
  try {
    parsed = content?.trim() ? JSON5.parse(content) : { src: [] }
  }
  catch {
    parsed = { src: [] }
  }

  const src = Array.isArray(parsed.src) ? parsed.src.filter((item): item is string => typeof item === 'string') : []
  if (!src.includes(routePath)) src.push(routePath)
  return stringifyJsonLike('main_pages.json', { ...parsed, src })
}

export function appendRouteMap(content: string | undefined, entry: { name: string, pageSourceFile: string, buildFunction: string }): string {
  let parsed: { routerMap?: unknown, [key: string]: unknown }
  try {
    parsed = content?.trim() ? JSON5.parse(content) : { routerMap: [] }
  }
  catch {
    parsed = { routerMap: [] }
  }

  const routerMap = Array.isArray(parsed.routerMap) ? [...parsed.routerMap] : []
  const alreadyRegistered = routerMap.some((item) => {
    if (!item || typeof item !== 'object') return false
    const record = item as Record<string, unknown>
    return record.name === entry.name || record.pageSourceFile === entry.pageSourceFile
  })
  if (!alreadyRegistered) routerMap.push(entry)
  return stringifyJsonLike('route_map.json', { ...parsed, routerMap })
}

export function ensureModuleProfileField(content: string | undefined, field: 'pages' | 'routerMap', profileRef: string): { content: string, changed: boolean } {
  const parsed = readModuleConfig(content)
  const module = { ...(parsed.module as Record<string, unknown>) }
  if (typeof module[field] === 'string' && module[field]) {
    return { content: content ?? stringifyJsonLike('module.json5', parsed), changed: false }
  }
  module[field] = profileRef
  return {
    content: stringifyJsonLike('module.json5', { ...parsed, module }),
    changed: true,
  }
}

function planRegistration(
  template: PageTemplateDefinition,
  pageFilePath: string,
  pageName: string,
  autoRegister: boolean,
  access: FileAccess,
): PlannedFileWrite[] {
  if (!autoRegister || template.register === 'none') return []

  const moduleJson5Path = findModuleJson5Path(path.dirname(pageFilePath), access.exists)
  if (!moduleJson5Path) return []

  const moduleRoot = getModuleRoot(moduleJson5Path)
  const moduleContent = access.readFile(moduleJson5Path)
  const extraFiles: PlannedFileWrite[] = []

  if (template.register === 'main_pages') {
    const pagesRef = getModuleField(readModuleConfig(moduleContent), 'pages')
    const profileName = resolveProfileRef(pagesRef, 'main_pages')
    const profilePath = resolveProfileFilePath(moduleRoot, profileName, access.exists)
    extraFiles.push({
      filePath: profilePath,
      content: appendMainPages(access.readFile(profilePath), getPageRoutePath(pageFilePath, moduleRoot)),
    })
    const updatedModule = ensureModuleProfileField(moduleContent, 'pages', `$profile:${profileName}`)
    if (updatedModule.changed) extraFiles.push({ filePath: moduleJson5Path, content: updatedModule.content })
    return extraFiles
  }

  const routerMapRef = getModuleField(readModuleConfig(moduleContent), 'routerMap')
  const profileName = resolveProfileRef(routerMapRef, 'route_map')
  const profilePath = resolveProfileFilePath(moduleRoot, profileName, access.exists)
  extraFiles.push({
    filePath: profilePath,
    content: appendRouteMap(access.readFile(profilePath), {
      name: pageName,
      pageSourceFile: getPageSourceFile(pageFilePath, moduleRoot),
      buildFunction: `${pageName}Builder`,
    }),
  })
  const updatedModule = ensureModuleProfileField(moduleContent, 'routerMap', `$profile:${profileName}`)
  if (updatedModule.changed) extraFiles.push({ filePath: moduleJson5Path, content: updatedModule.content })
  return extraFiles
}

export function planCreatePage(
  template: PageTemplateDefinition,
  pageNameInput: string,
  targetDir: string,
  autoRegister: boolean,
  access: FileAccess,
): CreatePagePlan {
  const pageName = normalizePageName(pageNameInput)
  const pageFilePath = path.join(targetDir, `${pageName}.ets`)
  return {
    pageFile: {
      filePath: pageFilePath,
      content: renderPageTemplate(template, pageName),
    },
    extraFiles: planRegistration(template, pageFilePath, pageName, autoRegister, access),
    registerTarget: autoRegister ? template.register : 'none',
  }
}
