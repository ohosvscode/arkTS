import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { globalLogger } from 'tsdown'
import { collectIdentifiers, resolveDependenciesByIdentifier } from './resolver'

export const PLATFORMS = {
  'win32-x64': ['win32'],
  'win32-arm64': ['win32'],
  'linux-x64': ['linux'],
  'alpine-x64': ['linux'],
  'linux-arm64': ['linux'],
  'alpine-arm64': ['linux'],
  'linux-armhf': ['linux'],
  'darwin-x64': ['darwin'],
  'darwin-arm64': ['darwin'],
  'web': ['wasm32'],
}

/**
 * 读取 pnpm workspace catalog 定义，将 package.json 中的 catalog:xxx 替换为实际版本号。
 * npm 不支持 catalog: 协议，因此 pre-process 使用 npm install 前必须先平展这些引用。
 */
function resolveCatalogDeps(pkgPath: string): void {
  const workspaceRoot = path.resolve(pkgPath, '../..')
  const workspaceFile = path.join(workspaceRoot, 'pnpm-workspace.yaml')
  const pkgJsonPath = path.join(pkgPath, 'package.json')

  if (!fs.existsSync(workspaceFile) || !fs.existsSync(pkgJsonPath)) return

  const yamlLines = fs.readFileSync(workspaceFile, 'utf-8').split('\n')
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))

  const catalogMap = new Map<string, string>()

  let inCatalogs = false
  let currentCatalog = ''

  for (const rawLine of yamlLines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (trimmed === 'catalogs:') {
      inCatalogs = true
      currentCatalog = ''
      continue
    }

    if (inCatalogs) {
      if (trimmed === '' || trimmed.startsWith('#')) continue
      // 如果碰到其他顶层键（如 catalog:），退出 catalogs 解析
      if (/^[a-z]/i.test(line) && !line.startsWith(' ') && !line.startsWith('\t')) {
        inCatalogs = false
        continue
      }
      // 子 catalog 头，如 "  prod:" 或 "  dev:"
      const catalogHeader = trimmed.match(/^(\w+):$/)
      if (catalogHeader) {
        currentCatalog = catalogHeader[1]
        continue
      }
      // 依赖行，如 "    volar-service-typescript: volar-2.4"
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx > 0) {
        const depName = trimmed.slice(0, colonIdx).trim()
        const depVersion = trimmed.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '')
        catalogMap.set(depName, depVersion)
        catalogMap.set(`${currentCatalog}:${depName}`, depVersion)
      }
    }
  }

  // 替换 package.json 中的 catalog 引用
  function replaceInDeps(deps: Record<string, string> | undefined) {
    if (!deps) return
    for (const key of Object.keys(deps)) {
      const val = deps[key]
      if (typeof val === 'string' && val.startsWith('catalog:')) {
        const catalogName = val.slice('catalog:'.length) || 'prod'
        const lookupKey = `${catalogName}:${key}`
        const resolved = catalogMap.get(lookupKey) || catalogMap.get(key)
        if (resolved) {
          globalLogger.info(`Resolved catalog dependency: ${key}@${val} -> ${resolved}`)
          deps[key] = resolved
        }
        else {
          globalLogger.warn(`Cannot resolve catalog dependency: ${key}@${val}, leaving unchanged`)
        }
      }
    }
  }

  replaceInDeps(pkgJson.dependencies)
  replaceInDeps(pkgJson.devDependencies)
  replaceInDeps(pkgJson.optionalDependencies)

  fs.writeFileSync(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`)
}

/**
 * This script is used to copy the `@arkts/project-detector` and
 * its dependencies to the `node_modules/@arkts/project-detector`
 * and `node_modules/@arkts/project-detector-*` directory.
 *
 * So the pnpm must disable the symlink feature.
 */
async function main() {
  globalLogger.info('Cleaning node_modules...')
  fs.rmSync(path.resolve('node_modules'), { recursive: true, force: true })
  globalLogger.info('Removing package-lock.json...')
  if (fs.existsSync(path.resolve('package-lock.json'))) fs.rmSync(path.resolve('package-lock.json'))
  else globalLogger.warn('package-lock.json not found, skipping deletion')

  globalLogger.info('Resolving catalog dependencies for npm compatibility...')
  const pkgJsonPath = path.join(path.resolve('.'), 'package.json')
  const backupPath = `${pkgJsonPath}.orig`
  fs.copyFileSync(pkgJsonPath, backupPath)
  resolveCatalogDeps(path.resolve('.'))

  globalLogger.info('Installing dev & prod dependencies using npm...')
  const projectDetectorIdentifiers = collectIdentifiers(resolveDependenciesByIdentifier('@arkts/project-detector')).map((identifier) => {
    if (identifier === '@arkts/project-detector') return `${identifier}@next`
    return identifier
  }).join(' ')
  const ohosRsOxkIdentifiers = collectIdentifiers(resolveDependenciesByIdentifier('@ohos-rs/oxk')).join(' ')
  const installCommand = `npm install ${projectDetectorIdentifiers} ${ohosRsOxkIdentifiers} --verbose --no-save ${process.env.OS ? ` --os=${process.env.OS}` : ''}${process.env.ARCH ? ` --arch=${process.env.ARCH}` : ''}${process.env.LIBC ? ` --libc=${process.env.LIBC}` : ''}${process.env.CPU ? ` --cpu=${process.env.CPU}` : ''}`
  globalLogger.info(installCommand)
  execSync(installCommand, { stdio: 'inherit' })
  globalLogger.info('Install done, start copying dependencies...')
  globalLogger.success('✨ Dependencies preprocessing done!')
}

main()
