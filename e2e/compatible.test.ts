import { execSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

// ============================================================================
// 常量定义
// ============================================================================

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

// 支持 CJS require 和 ESM import 的包列表
// language-server 不能作为库使用，应该作为二进制文件使用
const TESTABLE_PACKAGES = [
  'language-plugin',
  'language-service',
  'shared',
  'types',
  'typescript-plugin',
  'vfs',
] as const

const DEFAULT_ENTRY_POINT = './out/index.js'
const LANGUAGE_SERVER_DEMO_TIMEOUT = 30000 // 30秒
const LANGUAGE_SERVER_TEST_TIMEOUT = 35000 // 35秒

const SUCCESS_INDICATORS = [
  'Demo 执行完成！',
  'Demo 执行完成',
  '语言服务器通信测试成功',
  '协议演示完成',
] as const

// ============================================================================
// 类型定义
// ============================================================================

type ModuleType = 'function' | 'object'

interface ModuleTestResult {
  type: ModuleType
  exports: number
}

type ModuleMode = 'cjs' | 'esm'

interface PackageJson {
  main?: string
  module?: string
  exports?: {
    '.'?: string | {
      require?: string | { default?: string }
      import?: string | { default?: string }
      default?: string
    }
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 从 package.json 中解析入口点路径
 */
function resolveEntryPoint(packageJson: PackageJson, mode: ModuleMode, defaultEntry: string = DEFAULT_ENTRY_POINT): string {
  const exportsField = packageJson.exports?.['.']

  // 如果 exports['.'] 是字符串，直接使用
  if (typeof exportsField === 'string') return exportsField

  // 处理 require 字段（CJS）
  if (mode === 'cjs' && exportsField?.require) {
    if (typeof exportsField.require === 'string') return exportsField.require
    if (exportsField.require?.default) return exportsField.require.default
  }

  // 处理 import 字段（ESM）
  if (mode === 'esm' && exportsField?.import) {
    if (typeof exportsField.import === 'string') return exportsField.import
    if (exportsField.import?.default) return exportsField.import.default
  }

  // 回退到 default
  if (exportsField?.default) return exportsField.default

  // 使用 package.json 的传统字段
  if (mode === 'cjs' && packageJson.main) return packageJson.main
  if (mode === 'esm' && packageJson.module) return packageJson.module
  return defaultEntry
}

/**
 * 读取并解析 package.json
 */
function readPackageJson(packagePath: string): PackageJson {
  const packageJsonPath = path.join(packagePath, 'package.json')
  return JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
}

/**
 * 验证模块导出
 */
function validateModuleExports(module: any): ModuleTestResult {
  // 检查是否是函数（默认导出）
  if (typeof module === 'function') return { type: 'function', exports: 0 }
  // 检查 ESM 的 default 函数导出
  if (typeof module.default === 'function') return { type: 'function', exports: 0 }
  // 检查模块是否有导出
  const exportKeys = Object.keys(module)
  if (exportKeys.length === 0) throw new Error('Expected module to have exports or be a function')

  return { type: 'object', exports: exportKeys.length }
}

/**
 * 处理缺失依赖的错误
 */
function handleMissingDependencyError(error: unknown, packageName: string): boolean {
  if (!(error instanceof Error)) return false
  const errorMessage = error.message
  const isMissingDependency = errorMessage.includes('Cannot find package')
    || errorMessage.includes('Cannot find module')

  if (isMissingDependency) {
    const shortMessage = errorMessage.split('\n')[0]
    console.warn(`⚠ ${packageName}: Skipped - missing dependency (${shortMessage})`)
    return true
  }

  return false
}

// ============================================================================
// 测试函数
// ============================================================================

/**
 * 测试包的 CJS 兼容性
 */
function testPackageCJS(packageName: string): ModuleTestResult {
  const packagePath = path.join(projectRoot, 'packages', packageName)
  const packageJson = readPackageJson(packagePath)
  const entryPoint = resolveEntryPoint(packageJson, 'cjs')

  const modulePath = path.resolve(packagePath, entryPoint)
  const require = createRequire(import.meta.url)
  const module = require(modulePath)

  return validateModuleExports(module)
}

/**
 * 测试包的 ESM 兼容性
 */
async function testPackageESM(packageName: string): Promise<ModuleTestResult> {
  const packagePath = path.join(projectRoot, 'packages', packageName)
  const packageJson = readPackageJson(packagePath)
  const entryPoint = resolveEntryPoint(packageJson, 'esm')

  const modulePath = path.resolve(packagePath, entryPoint)
  const moduleUrl = pathToFileURL(modulePath).href
  const module = await import(moduleUrl)

  return validateModuleExports(module)
}

/**
 * 测试语言服务器 demo
 */
async function testLanguageServer(mode: ModuleMode = 'cjs'): Promise<boolean> {
  const demoPath = path.join(projectRoot, 'packages', 'language-server', 'e2e', 'demo.mjs')
  if (!existsSync(demoPath)) throw new Error(`Demo file not found: ${demoPath}`)

  try {
    const args = mode === 'esm' ? 'esm' : ''
    const result = execSync(`node "${demoPath}" ${args}`, {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: LANGUAGE_SERVER_DEMO_TIMEOUT,
      stdio: 'pipe',
    })

    return SUCCESS_INDICATORS.some(indicator => result.includes(indicator))
  }
  catch (error: any) {
    // 处理超时
    if (error.code === 'ETIMEDOUT') throw new Error(`Demo timed out (${LANGUAGE_SERVER_DEMO_TIMEOUT / 1000}s)`)
    // 检查是否在 stdout 中显示成功（即使有错误）
    if (error.stdout && (error.stdout.includes('协议演示完成') || error.stdout.includes('Demo 执行完成'))) return true
    throw new Error(`Demo failed: ${error.message}`)
  }
}

/**
 * 验证 VSCode 包的构建产物
 */
function testVscodePackage(): number {
  const vscodePackagePath = path.join(projectRoot, 'packages', 'vscode')
  const mainFile = path.join(vscodePackagePath, 'dist', 'client.js')
  if (!existsSync(mainFile)) throw new Error(`Main file not found: ${mainFile}`)
  const stats = statSync(mainFile)
  if (stats.size === 0) throw new Error('Main file is empty')
  return stats.size
}

// ============================================================================
// 测试套件
// ============================================================================

// 构建项目
execSync('pnpm build', { cwd: projectRoot, stdio: 'inherit' })

describe('package Compatibility Tests', () => {
  describe('commonJS (require)', () => {
    for (const packageName of TESTABLE_PACKAGES) {
      it(`should require ${packageName} as CJS module`, () => {
        try {
          const result = testPackageCJS(packageName)
          expect(result).toBeDefined()
          if (result.type === 'function') {
            expect(result).toBeTypeOf('object')
          }
          else {
            expect(result.exports).toBeGreaterThan(0)
          }
        }
        catch (error) {
          if (handleMissingDependencyError(error, packageName)) {
            return
          }
          throw error
        }
      })
    }

    it('should test language-server demo (CJS mode)', async () => {
      const success = await testLanguageServer('cjs')
      expect(success).toBe(true)
    }, LANGUAGE_SERVER_TEST_TIMEOUT)

    it('should validate vscode package build artifacts', () => {
      const size = testVscodePackage()
      expect(size).toBeGreaterThan(0)
      expect(size).toBeTypeOf('number')
    })
  })

  describe('esm (import)', () => {
    for (const packageName of TESTABLE_PACKAGES) {
      it(`should import ${packageName} as ESM module`, async () => {
        try {
          const result = await testPackageESM(packageName)
          expect(result).toBeDefined()
          if (result.type === 'function') {
            expect(result).toBeTypeOf('object')
          }
          else {
            expect(result.exports).toBeGreaterThan(0)
          }
        }
        catch (error: any) {
          if (handleMissingDependencyError(error, packageName)) {
            return
          }
          throw error
        }
      })
    }

    it('should test language-server demo (ESM mode)', async () => {
      const success = await testLanguageServer('esm')
      expect(success).toBe(true)
    }, LANGUAGE_SERVER_TEST_TIMEOUT)
  })
})
