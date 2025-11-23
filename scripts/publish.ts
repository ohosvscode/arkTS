import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { globalLogger as logger } from 'tsdown'

const dirname = fileURLToPath(new URL('.', import.meta.url))

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
  try {
    logger.info(`Publishing to VSCE...`)
    const command = `pnpm -F vscode-naily-ets vsce ${process.argv.slice(2).includes('--dry-run') ? 'package' : 'publish'} ${process.argv.slice(2).filter(v => v !== '--dry-run').join(' ')}`
    logger.info(`Executing command: ${command}`)
    execSync(command, { cwd: path.resolve(dirname, '..'), stdio: 'inherit' })
    return true
  }
  catch (error) {
    logger.error(`Failed to publish to VSCE: ${error instanceof Error ? error.message : String(error)}`)
    console.error(error)
    return false
  }
}

function publishToOvsce(): boolean {
  try {
    if (process.argv.includes('--dry-run')) {
      logger.warn(`Skipping OVSCE package in dry-run mode.`)
      return true
    }
    logger.info(`Publishing to OVSCE...`)
    const command = `pnpm -F vscode-naily-ets ovsx publish ${process.argv.slice(2).filter(v => v !== '--dry-run').join(' ')}`
    logger.info(`Executing command: ${command}`)
    execSync(command, { cwd: path.resolve(dirname, '..'), stdio: 'inherit' })
    return true
  }
  catch (error) {
    logger.error(`Failed to publish to OVSCE: ${error instanceof Error ? error.message : String(error)}`)
    console.error(error)
    return false
  }
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
