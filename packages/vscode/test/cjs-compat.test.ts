import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import {
  CJS_NEVER_BUNDLE,
  ESM_ONLY_NATIVE_JS_PACKAGES,
  findEsmOnlyCjsRequires,
  isEsmOnlyNativeJsPackage,
  isNativePlatformPackage,
} from '../scripts/cjs-compat'

const require = createRequire(import.meta.url)
const vscodeRoot = path.resolve(fileURLToPath(import.meta.url), '../..')

describe('cjs native package compatibility', () => {
  it('does not treat ESM-only JS loaders as bundle externals', () => {
    for (const pkg of ESM_ONLY_NATIVE_JS_PACKAGES) {
      expect(CJS_NEVER_BUNDLE.some(item => item === pkg)).toBe(false)
      expect(isEsmOnlyNativeJsPackage(pkg)).toBe(true)
      expect(isNativePlatformPackage(pkg)).toBe(false)
    }
  })

  it('keeps native platform packages external', () => {
    expect(isNativePlatformPackage('@arkts/project-detector-linux-x64-gnu')).toBe(true)
    expect(isNativePlatformPackage('@ohos-rs/oxk-win32-x64-msvc')).toBe(true)
    expect(isEsmOnlyNativeJsPackage('@arkts/project-detector-linux-x64-gnu')).toBe(false)
  })

  it('detects CJS require() of ESM-only packages', () => {
    expect(findEsmOnlyCjsRequires(`const x = require('@arkts/project-detector')`)).toEqual([
      '@arkts/project-detector',
    ])
    expect(findEsmOnlyCjsRequires(`require("@ohos-rs/oxk")`)).toEqual([])
    expect(findEsmOnlyCjsRequires(`require('@arkts/project-detector-linux-x64-gnu')`)).toEqual([])
    expect(findEsmOnlyCjsRequires(`require('vscode')`)).toEqual([])
  })

  it('reproduces ERR_REQUIRE_ESM for the published ESM-only loaders', () => {
    for (const pkg of ESM_ONLY_NATIVE_JS_PACKAGES) {
      let packageJsonPath: string
      try {
        packageJsonPath = require.resolve(`${pkg}/package.json`)
      }
      catch {
        continue
      }

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { type?: string }
      expect(packageJson.type).toBe('module')

      try {
        execFileSync(process.execPath, [
          '--no-experimental-require-module',
          '-e',
          `require(${JSON.stringify(pkg)})`,
        ], {
          cwd: vscodeRoot,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        throw new Error(`expected require(${pkg}) to fail without require(esm)`)
      }
      catch (error: any) {
        if (error instanceof Error && error.message.startsWith('expected require(')) throw error
        const stderr = typeof error?.stderr === 'string' ? error.stderr : String(error)
        expect(stderr).toMatch(/ERR_REQUIRE_ESM|require\(\) of ES Module/)
      }
    }
  })

  it('inlines ESM-only loaders in built CJS artifacts when present', () => {
    const artifacts = [
      path.join(vscodeRoot, 'dist', 'client.js'),
      path.join(vscodeRoot, 'dist', 'server.js'),
      path.join(vscodeRoot, 'dist', 'client.cjs'),
      path.join(vscodeRoot, 'dist', 'server.cjs'),
    ].filter(filePath => existsSync(filePath))

    if (artifacts.length === 0) return

    for (const filePath of artifacts) {
      const source = readFileSync(filePath, 'utf-8')
      expect(findEsmOnlyCjsRequires(source), filePath).toEqual([])
    }
  })

  it('can parse the CJS language server without require(esm)', () => {
    const serverPath = [
      path.join(vscodeRoot, 'dist', 'server.js'),
      path.join(vscodeRoot, 'dist', 'server.cjs'),
    ].find(filePath => existsSync(filePath))
    if (!serverPath) return

    try {
      execFileSync(process.execPath, [
        '--no-experimental-require-module',
        '--check',
        serverPath,
      ], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    }
    catch (error: any) {
      const stderr = typeof error?.stderr === 'string' ? error.stderr : String(error)
      expect(stderr).not.toMatch(/ERR_REQUIRE_ESM|require\(\) of ES Module/)
      throw error
    }
  })
})
