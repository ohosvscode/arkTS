import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import which from 'which'

export type HarmonyToolsKind = 'command-line-tools' | 'deveco-studio'

export interface DetectedHarmonyTools {
  kind: HarmonyToolsKind
  toolsRoot: string
  openHarmonySdkPath: string
}

export interface HarmonyToolsFs {
  isDirectory(targetPath: string): Promise<boolean>
  isFile(targetPath: string): Promise<boolean>
  readDirectory(targetPath: string): Promise<string[]>
}

interface PathApi {
  join(...segments: string[]): string
  dirname(targetPath: string): string
  basename(targetPath: string): string
}

export interface DetectHarmonyToolsOptions {
  env?: NodeJS.Dict<string>
  platform?: NodeJS.Platform
  homedir?: string
  fs?: HarmonyToolsFs
  resolveCommand?(command: string): string | undefined
}

const OPENHARMONY_SDK_SEGMENTS = ['sdk', 'default', 'openharmony'] as const

export function createNodeHarmonyToolsFs(): HarmonyToolsFs {
  return {
    async isDirectory(targetPath) {
      return fs.stat(targetPath).then(stat => stat.isDirectory(), () => false)
    },
    async isFile(targetPath) {
      return fs.stat(targetPath).then(stat => stat.isFile(), () => false)
    },
    async readDirectory(targetPath) {
      return fs.readdir(targetPath).then(names => names, () => [])
    },
  }
}

/**
 * Detect a Command-line-tools or DevEco Studio install and resolve
 * `sdk/default/openharmony` (or a versioned child that looks like an ETS SDK).
 */
export async function detectHarmonyTools(options: DetectHarmonyToolsOptions = {}): Promise<DetectedHarmonyTools | undefined> {
  const env = options.env ?? process.env
  const platform = options.platform ?? process.platform
  const homedir = options.homedir ?? os.homedir()
  const pathImpl = platform === 'win32' ? path.win32 : path.posix
  const fileSystem = options.fs ?? createNodeHarmonyToolsFs()
  const resolveCommand = options.resolveCommand ?? ((command: string) => which.sync(command, { nothrow: true }) ?? undefined)

  for (const candidate of collectCandidateRoots(env, platform, homedir, pathImpl, resolveCommand)) {
    const detected = await resolveFromToolsRoot(candidate.root, candidate.kind, pathImpl, fileSystem)
    if (detected) return detected
  }

  const sdkHome = firstNonEmpty(env.DEVECO_SDK_HOME)
  if (sdkHome) {
    const fromSdkHome = await resolveFromSdkHome(sdkHome, inferKindFromRoot(sdkHome, pathImpl), pathImpl, fileSystem)
    if (fromSdkHome) return fromSdkHome
  }

  const hvigorw = resolveCommand('hvigorw') ?? resolveCommand('hvigor')
  if (hvigorw) {
    const fromExecutable = await walkUpForSdk(hvigorw, pathImpl, fileSystem)
    if (fromExecutable) return fromExecutable
  }
}

function collectCandidateRoots(
  env: NodeJS.Dict<string>,
  platform: NodeJS.Platform,
  homedir: string,
  pathImpl: PathApi,
  resolveCommand: (command: string) => string | undefined,
): { kind: HarmonyToolsKind, root: string }[] {
  const candidates: { kind: HarmonyToolsKind, root: string }[] = []
  const seen = new Set<string>()

  const push = (kind: HarmonyToolsKind, root: string | undefined): void => {
    if (!root) return
    const normalized = normalizeRoot(root, pathImpl)
    const key = normalized.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    candidates.push({ kind, root: normalized })
  }

  push('deveco-studio', firstNonEmpty(env['DevEco Studio'], env.DEVECO_STUDIO_HOME, env.DEVECO_HOME))
  push('command-line-tools', firstNonEmpty(env.HARMONY_COMMAND_LINE_TOOLS, env.COMMAND_LINE_TOOLS_HOME))

  for (const root of getWellKnownCommandLineToolsRoots(platform, homedir, pathImpl))
    push('command-line-tools', root)
  for (const root of getWellKnownDevEcoRoots(platform, env, pathImpl))
    push('deveco-studio', root)

  const hvigorw = resolveCommand('hvigorw') ?? resolveCommand('hvigor')
  if (hvigorw) push(inferKindFromRoot(hvigorw, pathImpl), pathImpl.dirname(hvigorw))

  return candidates
}

function getWellKnownCommandLineToolsRoots(platform: NodeJS.Platform, homedir: string, pathImpl: PathApi): string[] {
  const roots = [
    '/opt/harmony/command-line-tools',
    '/opt/harmonyos/command-line-tools',
    pathImpl.join(homedir, 'command-line-tools'),
    pathImpl.join(homedir, 'Huawei', 'command-line-tools'),
  ]
  if (platform === 'win32') {
    roots.push(
      'C:\\Huawei\\command-line-tools',
      'C:\\Program Files\\Huawei\\command-line-tools',
    )
  }
  return roots
}

function getWellKnownDevEcoRoots(platform: NodeJS.Platform, env: NodeJS.Dict<string>, pathImpl: PathApi): string[] {
  if (platform === 'darwin') {
    return [
      '/Applications/DevEco-Studio.app/Contents',
      '/Applications/DevEco Studio.app/Contents',
    ]
  }
  if (platform === 'win32') {
    const programFiles = firstNonEmpty(env.ProgramFiles, env.PROGRAMFILES) || 'C:\\Program Files'
    return [
      pathImpl.join(programFiles, 'Huawei', 'DevEco Studio'),
      pathImpl.join(programFiles, 'DevEco Studio'),
      'C:\\Huawei\\DevEcoStudio',
    ]
  }
  return [
    '/opt/DevEco-Studio',
    '/opt/deveco-studio',
  ]
}

async function resolveFromToolsRoot(
  toolsRoot: string,
  kind: HarmonyToolsKind,
  pathImpl: PathApi,
  fileSystem: HarmonyToolsFs,
): Promise<DetectedHarmonyTools | undefined> {
  const openHarmonyRoot = pathImpl.join(toolsRoot, ...OPENHARMONY_SDK_SEGMENTS)
  return resolveOpenHarmonySdk(openHarmonyRoot, toolsRoot, kind, pathImpl, fileSystem)
}

async function resolveFromSdkHome(
  sdkHome: string,
  kind: HarmonyToolsKind,
  pathImpl: PathApi,
  fileSystem: HarmonyToolsFs,
): Promise<DetectedHarmonyTools | undefined> {
  const toolsRoot = pathImpl.basename(sdkHome).toLowerCase() === 'sdk' ? pathImpl.dirname(sdkHome) : sdkHome
  const candidates = [
    pathImpl.join(sdkHome, 'default', 'openharmony'),
    pathImpl.join(sdkHome, 'openharmony'),
    sdkHome,
  ]
  for (const candidate of candidates) {
    const detected = await resolveOpenHarmonySdk(candidate, toolsRoot, kind, pathImpl, fileSystem)
    if (detected) return detected
  }
}

async function walkUpForSdk(
  startPath: string,
  pathImpl: PathApi,
  fileSystem: HarmonyToolsFs,
): Promise<DetectedHarmonyTools | undefined> {
  let current = pathImpl.dirname(startPath)
  const seen = new Set<string>()
  while (!seen.has(current)) {
    seen.add(current)
    const detected = await resolveFromToolsRoot(current, inferKindFromRoot(current, pathImpl), pathImpl, fileSystem)
    if (detected) return detected
    const parent = pathImpl.dirname(current)
    if (parent === current) break
    current = parent
  }
}

async function resolveOpenHarmonySdk(
  openHarmonyRoot: string,
  toolsRoot: string,
  kind: HarmonyToolsKind,
  pathImpl: PathApi,
  fileSystem: HarmonyToolsFs,
): Promise<DetectedHarmonyTools | undefined> {
  if (await isValidEtsSdkPath(openHarmonyRoot, pathImpl, fileSystem)) {
    return { kind, toolsRoot, openHarmonySdkPath: openHarmonyRoot }
  }

  if (!await fileSystem.isDirectory(openHarmonyRoot)) return

  const versions = (await fileSystem.readDirectory(openHarmonyRoot))
    .filter(name => /^\d+$/.test(name))
    .map(Number)
    .sort((a, b) => b - a)

  for (const version of versions) {
    const versionPath = pathImpl.join(openHarmonyRoot, String(version))
    if (await isValidEtsSdkPath(versionPath, pathImpl, fileSystem)) {
      return { kind, toolsRoot, openHarmonySdkPath: versionPath }
    }
  }
}

export async function isValidEtsSdkPath(
  sdkPath: string,
  pathImpl: PathApi = path,
  fileSystem: HarmonyToolsFs = createNodeHarmonyToolsFs(),
): Promise<boolean> {
  if (!await fileSystem.isDirectory(sdkPath)) return false
  const etsComponent = pathImpl.join(sdkPath, 'ets', 'component')
  const etsLoaderConfig = pathImpl.join(sdkPath, 'ets', 'build-tools', 'ets-loader', 'tsconfig.json')
  return await fileSystem.isDirectory(etsComponent) && await fileSystem.isFile(etsLoaderConfig)
}

function inferKindFromRoot(root: string, pathImpl: PathApi): HarmonyToolsKind {
  const normalized = root.replace(/\\/g, '/').toLowerCase()
  if (normalized.includes('command-line-tools') || pathImpl.basename(pathImpl.dirname(root)).toLowerCase() === 'bin') return 'command-line-tools'
  return 'deveco-studio'
}

function normalizeRoot(root: string, pathImpl: PathApi): string {
  let normalized = root.trim()
  if (!normalized) return normalized
  if (pathImpl.basename(normalized).toLowerCase() === 'bin') normalized = pathImpl.dirname(normalized)
  if (normalized.toLowerCase().endsWith('.app')) normalized = pathImpl.join(normalized, 'Contents')
  return normalized
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find(value => typeof value === 'string' && value.trim() !== '')?.trim()
}
