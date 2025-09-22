import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { CodeLinterConfigManager } from '../src/classes/code-linter-config'

// 简化的mock logger
const mockLogger = {
  getConsola: () => ({
    info: () => {},
    debug: () => {},
    warn: () => {},
    error: () => {},
  }),
  getDebug: () => false,
} as any

describe('CodeLinterConfigManager - 实际文件系统测试', () => {
  let tempDir: string
  let configManager: CodeLinterConfigManager

  beforeEach(() => {
    // 创建临时目录
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arkts-test-'))
    configManager = new CodeLinterConfigManager(mockLogger, tempDir)
  })

  afterEach(() => {
    // 清理临时目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('配置文件加载', () => {
    it('应该成功加载有效的JSON5配置文件', async () => {
      const configContent = `{
        // 文件匹配规则
        "files": ["**/*.ets", "**/*.ts"],
        "rules": {
          "@hw-stylistic/indent": ["error", 2],
          "@typescript-eslint/semi": ["error", "never"]
        }
      }`

      const configPath = path.join(tempDir, 'code-linter.json5')
      fs.writeFileSync(configPath, configContent, 'utf-8')

      const config = await configManager.loadConfig()

      expect(config).toBeDefined()
      expect(config?.files).toEqual(['**/*.ets', '**/*.ts'])
      expect(config?.rules?.['@hw-stylistic/indent']).toEqual(['error', 2])
      expect(config?.rules?.['@typescript-eslint/semi']).toEqual(['error', 'never'])
    })

    it('当没有配置文件时应该返回null', async () => {
      const config = await configManager.loadConfig()
      expect(config).toBeNull()
    })

    it('应该处理无效的JSON内容', async () => {
      const invalidConfig = '{ invalid json content'
      const configPath = path.join(tempDir, 'code-linter.json5')
      fs.writeFileSync(configPath, invalidConfig, 'utf-8')

      const config = await configManager.loadConfig()
      expect(config).toBeNull()
    })
  })

  describe('格式化配置提取', () => {
    it('应该从linter规则中提取格式化配置', async () => {
      const configContent = `{
        "rules": {
          "@hw-stylistic/indent": ["error", 4],
          "@typescript-eslint/semi": ["error", "always"],
          "@hw-stylistic/space-before-function-paren": ["error", "always"]
        }
      }`

      const configPath = path.join(tempDir, 'code-linter.json5')
      fs.writeFileSync(configPath, configContent, 'utf-8')

      await configManager.loadConfig()
      const formattingConfig = configManager.getFormattingConfig()

      expect(formattingConfig).toBeDefined()
      expect(formattingConfig?.indentSize).toBe(4)
      expect(formattingConfig?.semicolons).toBe('insert')
      expect(formattingConfig?.insertSpaceBeforeFunctionParenthesis).toBe(true)
    })

    it('当没有格式化规则时应该返回null', async () => {
      const configContent = '{ "files": ["**/*.ets"] }'
      const configPath = path.join(tempDir, 'code-linter.json5')
      fs.writeFileSync(configPath, configContent, 'utf-8')

      await configManager.loadConfig()
      const formattingConfig = configManager.getFormattingConfig()

      expect(formattingConfig).toBeNull()
    })
  })

  describe('文件匹配', () => {
    it('应该正确匹配文件模式', async () => {
      const configContent = `{
        "files": ["src/**/*.ets", "**/*.ts"],
        "ignore": ["**/test/**", "**/node_modules/**"]
      }`

      const configPath = path.join(tempDir, 'code-linter.json5')
      fs.writeFileSync(configPath, configContent, 'utf-8')

      await configManager.loadConfig()

      // 测试文件匹配 - 修复路径匹配逻辑
      expect(configManager.isFileMatched('src/main.ets')).toBe(true)
      expect(configManager.isFileMatched('lib/utils.ts')).toBe(true)
      expect(configManager.isFileMatched('style.css')).toBe(false)

      // 测试忽略规则
      expect(configManager.isFileMatched('test/spec.ets')).toBe(false)
      expect(configManager.isFileMatched('node_modules/lib.ts')).toBe(false)
    })

    it('当没有配置时应该匹配所有文件', () => {
      expect(configManager.isFileMatched('/any/file.ets')).toBe(true)
      expect(configManager.isFileMatched('/any/file.ts')).toBe(true)
      expect(configManager.isFileMatched('/any/file.css')).toBe(true)
    })
  })

  describe('规则配置访问', () => {
    it('应该提供单独规则配置的访问', async () => {
      const configContent = `{
        "rules": {
          "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
          "@hw-stylistic/indent": ["error", 2],
          "@typescript-eslint/no-explicit-any": "off"
        }
      }`

      const configPath = path.join(tempDir, 'code-linter.json5')
      fs.writeFileSync(configPath, configContent, 'utf-8')

      await configManager.loadConfig()

      expect(configManager.getRuleConfig('@typescript-eslint/no-unused-vars')).toEqual([
        'warn',
        { argsIgnorePattern: '^_' }
      ])
      expect(configManager.getRuleConfig('@hw-stylistic/indent')).toEqual(['error', 2])
      expect(configManager.getRuleConfig('@typescript-eslint/no-explicit-any')).toBe('off')
      expect(configManager.getRuleConfig('non-existent-rule')).toBeUndefined()
    })
  })

  describe('配置重新加载', () => {
    it('应该支持配置热更新', async () => {
      // 创建初始配置
      const initialConfig = `{
        "rules": {
          "@typescript-eslint/no-unused-vars": "error"
        }
      }`

      const configPath = path.join(tempDir, 'code-linter.json5')
      fs.writeFileSync(configPath, initialConfig, 'utf-8')

      // 首次加载
      let config = await configManager.loadConfig()
      expect(config?.rules?.['@typescript-eslint/no-unused-vars']).toBe('error')

      // 等待一小段时间确保文件时间戳不同
      await new Promise(resolve => setTimeout(resolve, 10))

      // 更新配置
      const updatedConfig = `{
        "rules": {
          "@typescript-eslint/no-unused-vars": "warn",
          "@hw-stylistic/indent": ["error", 2]
        }
      }`

      fs.writeFileSync(configPath, updatedConfig, 'utf-8')

      // 重新加载
      await configManager.reloadConfig()
      config = configManager.getConfig()

      expect(config?.rules?.['@typescript-eslint/no-unused-vars']).toBe('warn')
      expect(config?.rules?.['@hw-stylistic/indent']).toEqual(['error', 2])
    })
  })

  describe('备用配置文件', () => {
    it('应该查找.eslintrc.json5作为备用配置', async () => {
      const configContent = `{
        "rules": {
          "@typescript-eslint/no-unused-vars": "warn"
        }
      }`

      const eslintrcPath = path.join(tempDir, '.eslintrc.json5')
      fs.writeFileSync(eslintrcPath, configContent, 'utf-8')

      const config = await configManager.loadConfig()
      expect(config).toBeDefined()
      expect(config?.rules?.['@typescript-eslint/no-unused-vars']).toBe('warn')
    })
  })
})