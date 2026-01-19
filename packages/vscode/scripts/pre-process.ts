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
  globalLogger.info('Installing dev & prod dependencies using npm...')
  execSync(`npm install ${collectIdentifiers(resolveDependenciesByIdentifier('@arkts/project-detector')).join(' ')} ${collectIdentifiers(resolveDependenciesByIdentifier('@ohos-rs/oxk')).join(' ')} --verbose --no-save --os=${process.env.OS ?? process.platform} --arch=${process.env.ARCH ?? process.arch}${process.env.LIBC ? ` --libc=${process.env.LIBC}` : ''}`, { stdio: 'inherit' })
  globalLogger.info('Install done, start copying dependencies...')
  globalLogger.success('✨ Dependencies preprocessing done!')
}

main()
