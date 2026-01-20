import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'
import { globalLogger as logger } from 'tsdown'

const dirname = fileURLToPath(new URL('.', import.meta.url))
const PROJECT_ROOT = path.resolve(dirname, '..')
const EXTENSION_TARGETS = [
  'win32-x64',
  'win32-arm64',
  'linux-x64',
  'linux-arm64',
  'linux-armhf',
  'darwin-x64',
  'darwin-arm64',
  'alpine-x64',
  'alpine-arm64',
  'web',
] as const

function getExtensionPackagePath(target: (typeof EXTENSION_TARGETS)[number]): string {
  const packagePath = path.resolve(PROJECT_ROOT, 'packages', 'vscode', `vscode-naily-ets-${target}-*.vsix`)
  const packages = fg.sync(packagePath)
  if (packages.length === 0) throw new Error(`No extension package found for target ${target}: ${Object.values(fg.sync(path.resolve(PROJECT_ROOT, 'packages', 'vscode', '*.vsix'))).join(', ')}`)
  if (packages.length > 1) throw new Error(`Multiple extension packages found for target ${target}: ${packages.join(', ')}`)
  return packages[0]
}

function publishNpmPackages(): boolean {
  try {
    logger.info(`Publishing @arkts/* packages...`)
    const command = `pnpm changeset publish`
    logger.info(`Executing command: ${command}`)
    execSync(command, { cwd: path.resolve(dirname, '..'), stdio: 'inherit' })
    return true
  }
  catch (error) {
    logger.error(`Failed to publish @arkts/* packages: ${error instanceof Error ? error.message : String(error)}`)
    console.error(error)
    return false
  }
}

function publishToVsce(): boolean {
  for (const target of EXTENSION_TARGETS) {
    try {
      const packagePath = getExtensionPackagePath(target)
      logger.info(`Publishing to VSCE for target ${target}...`)
      const command = `pnpm -F vscode-naily-ets vsce publish --target ${target} --packagePath ${packagePath}`
      logger.info(`Executing command: ${command}`)
      execSync(command, { cwd: path.resolve(dirname, '..'), stdio: 'inherit' })
    }
    catch (error) {
      logger.error(`Failed to publish to VSCE for target ${target}: ${error instanceof Error ? error.message : String(error)}`)
      console.error(error)
      return false
    }
  }
  return true
}

function publishToOvsce(): boolean {
  for (const target of EXTENSION_TARGETS) {
    try {
      const packagePath = getExtensionPackagePath(target)
      logger.info(`Publishing to OVSCE for target ${target}...`)
      const command = `pnpm -F vscode-naily-ets ovsx publish --target ${target} --packagePath ${packagePath}`
      logger.info(`Executing command: ${command}`)
      execSync(command, { cwd: path.resolve(dirname, '..'), stdio: 'inherit' })
    }
    catch (error) {
      logger.error(`Failed to publish to OVSCE for target ${target}: ${error instanceof Error ? error.message : String(error)}`)
      console.error(error)
      return false
    }
  }
  return true
}

;(async () => {
  publishNpmPackages()
  execSync(`pnpm tsx scripts/pre-process.ts`, { cwd: path.resolve(`packages`, `vscode`), stdio: `inherit` })
  execSync(`pnpm run build`, { cwd: path.resolve(`packages`, `vscode`), stdio: `inherit` })
  const isPublishedToVsce = publishToVsce()
  const isPublishedToOvsce = publishToOvsce()
  // Changesets/action will check the stdout to get the new versioning tag
  if (isPublishedToVsce || isPublishedToOvsce) {
    const packageJson = JSON.parse(fs.readFileSync(path.resolve(dirname, '..', 'packages', 'vscode', 'package.json'), 'utf-8'))
    execSync(`git tag ${packageJson.name}@${packageJson.version}`, { cwd: path.resolve(dirname, '..'), stdio: 'inherit' })
    console.log(`🦋 New tag: ${packageJson.name}@${packageJson.version}`)
  }
  execSync(`pnpm tsx scripts/clean-process.ts`, { cwd: path.resolve(`packages`, `vscode`), stdio: `inherit` })
})()
