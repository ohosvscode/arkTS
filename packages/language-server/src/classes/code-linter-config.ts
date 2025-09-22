import type { LanguageServerLogger } from '@arkts/shared'
import fs from 'node:fs'
import path from 'node:path'
import JSON5 from 'json5'

/**
 * 代码linter配置接口
 * 与 packages/vscode/schemas/code-linter.schema.json 保持一致
 */
export interface CodeLinterConfig {
  files?: string[]
  ignore?: string[]
  plugins?: string[]
  ruleSet?: string[]
  rules?: Record<string, any>
  overrides?: Array<{
    files: string[]
    excluded?: string[]
    rules?: Record<string, any>
  }>
}

/**
 * 格式化配置接口
 */
export interface FormattingConfig {
  baseIndentSize?: number
  indentSize?: number
  tabSize?: number
  convertTabsToSpaces?: boolean
  indentStyle?: 'None' | 'Block' | 'Smart'
  trimTrailingWhitespace?: boolean
  insertSpaceAfterCommaDelimiter?: boolean
  insertSpaceAfterSemicolonInForStatements?: boolean
  insertSpaceBeforeAndAfterBinaryOperators?: boolean
  insertSpaceAfterConstructor?: boolean
  insertSpaceAfterKeywordsInControlFlowStatements?: boolean
  insertSpaceAfterFunctionKeywordForAnonymousFunctions?: boolean
  insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis?: boolean
  insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets?: boolean
  insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces?: boolean
  insertSpaceAfterOpeningAndBeforeClosingEmptyBraces?: boolean
  insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces?: boolean
  insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces?: boolean
  insertSpaceAfterTypeAssertion?: boolean
  insertSpaceBeforeFunctionParenthesis?: boolean
  placeOpenBraceOnNewLineForFunctions?: boolean
  placeOpenBraceOnNewLineForControlBlocks?: boolean
  insertSpaceBeforeTypeAnnotation?: boolean
  indentMultiLineObjectLiteralBeginningOnBlankLine?: boolean
  semicolons?: 'ignore' | 'insert' | 'remove'
}

/**
 * Code Linter 配置管理器
 * 负责加载和管理项目中的代码规则配置
 */
export class CodeLinterConfigManager {
  private config: CodeLinterConfig | null = null
  private formattingConfig: FormattingConfig | null = null
  private configFilePath: string | null = null
  private lastModified: number = 0

  constructor(
    private readonly logger: LanguageServerLogger,
    private readonly projectRoot: string,
  ) {}

  /**
   * 加载code-linter配置文件
   */
  async loadConfig(): Promise<CodeLinterConfig | null> {
    try {
      // 查找配置文件
      const configPath = this.findConfigFile()
      if (!configPath) {
        this.logger.getConsola().debug('未找到 code-linter.json5 配置文件')
        return null
      }

      // 检查文件是否修改
      const stats = fs.statSync(configPath)
      if (this.configFilePath === configPath && this.lastModified === stats.mtimeMs && this.config) {
        return this.config
      }

      // 读取并解析配置文件
      const configContent = fs.readFileSync(configPath, 'utf-8')
      this.config = JSON5.parse(configContent)
      this.configFilePath = configPath
      this.lastModified = stats.mtimeMs

      this.logger.getConsola().info(`已加载code-linter配置: ${configPath}`)
      this.logger.getConsola().debug('Code-linter配置内容:', this.config)

      // 提取格式化配置
      this.extractFormattingConfig()

      return this.config
    }
    catch (error) {
      this.logger.getConsola().error('加载code-linter配置失败:', error)
      return null
    }
  }

  /**
   * 查找配置文件
   */
  private findConfigFile(): string | null {
    const possiblePaths = [
      path.join(this.projectRoot, 'code-linter.json5'),
      path.join(this.projectRoot, '.eslintrc.json5'),
      path.join(this.projectRoot, '.eslintrc.json'),
    ]

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        return configPath
      }
    }

    return null
  }

  /**
   * 从linter配置中提取格式化相关配置
   */
  private extractFormattingConfig(): void {
    if (!this.config?.rules) {
      this.formattingConfig = null
      return
    }

    const formatting: FormattingConfig = {}
    const rules = this.config.rules

    // 根据ESLint/TypeScript-ESLint规则映射到格式化配置
    if (rules['@hw-stylistic/indent']) {
      const indentRule = rules['@hw-stylistic/indent']
      if (Array.isArray(indentRule) && indentRule.length > 1) {
        const indentValue = indentRule[1]
        if (typeof indentValue === 'number') {
          formatting.indentSize = indentValue
          formatting.tabSize = indentValue
        }
        else if (indentValue === 'tab') {
          formatting.convertTabsToSpaces = false
        }
      }
    }

    if (rules['@hw-stylistic/quotes']) {
      // quotes规则不直接影响格式化，但可以用于语法检查
    }

    if (rules['@typescript-eslint/semi']) {
      const semiRule = rules['@typescript-eslint/semi']
      if (Array.isArray(semiRule) && semiRule.length > 1) {
        const semiValue = semiRule[1]
        if (semiValue === 'always') {
          formatting.semicolons = 'insert'
        }
        else if (semiValue === 'never') {
          formatting.semicolons = 'remove'
        }
      }
    }

    if (rules['@hw-stylistic/space-before-function-paren']) {
      const spaceRule = rules['@hw-stylistic/space-before-function-paren']
      if (Array.isArray(spaceRule) && spaceRule.length > 1) {
        formatting.insertSpaceBeforeFunctionParenthesis = spaceRule[1] === 'always'
      }
    }

    if (rules['@hw-stylistic/space-infix-ops']) {
      const spaceRule = rules['@hw-stylistic/space-infix-ops']
      if (spaceRule === 'error' || spaceRule === 'warn') {
        formatting.insertSpaceBeforeAndAfterBinaryOperators = true
      }
    }

    if (rules['@hw-stylistic/keyword-spacing']) {
      const spaceRule = rules['@hw-stylistic/keyword-spacing']
      if (spaceRule === 'error' || spaceRule === 'warn') {
        formatting.insertSpaceAfterKeywordsInControlFlowStatements = true
      }
    }

    if (rules['@hw-stylistic/comma-spacing']) {
      const spaceRule = rules['@hw-stylistic/comma-spacing']
      if (spaceRule === 'error' || spaceRule === 'warn') {
        formatting.insertSpaceAfterCommaDelimiter = true
      }
    }

    // 设置默认值
    if (Object.keys(formatting).length > 0) {
      this.formattingConfig = {
        // 默认配置
        baseIndentSize: 0,
        indentSize: 2,
        tabSize: 2,
        convertTabsToSpaces: true,
        indentStyle: 'Smart',
        trimTrailingWhitespace: true,
        insertSpaceAfterCommaDelimiter: true,
        insertSpaceAfterSemicolonInForStatements: true,
        insertSpaceBeforeAndAfterBinaryOperators: true,
        insertSpaceAfterConstructor: false,
        insertSpaceAfterKeywordsInControlFlowStatements: true,
        insertSpaceAfterFunctionKeywordForAnonymousFunctions: false,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false,
        insertSpaceAfterOpeningAndBeforeClosingEmptyBraces: false,
        insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: true,
        insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: true,
        insertSpaceAfterTypeAssertion: false,
        insertSpaceBeforeFunctionParenthesis: false,
        placeOpenBraceOnNewLineForFunctions: false,
        placeOpenBraceOnNewLineForControlBlocks: false,
        insertSpaceBeforeTypeAnnotation: true,
        indentMultiLineObjectLiteralBeginningOnBlankLine: false,
        semicolons: 'ignore',
        // 覆盖用户配置
        ...formatting,
      }
    }
    else {
      this.formattingConfig = null
    }

    this.logger.getConsola().debug('提取的格式化配置:', this.formattingConfig)
  }

  /**
   * 获取当前配置
   */
  getConfig(): CodeLinterConfig | null {
    return this.config
  }

  /**
   * 获取格式化配置
   */
  getFormattingConfig(): FormattingConfig | null {
    return this.formattingConfig
  }

  /**
   * 获取指定规则的配置
   */
  getRuleConfig(ruleName: string): any {
    return this.config?.rules?.[ruleName]
  }

  /**
   * 检查文件是否匹配配置的files模式
   */
  isFileMatched(filePath: string): boolean {
    if (!this.config) return true

    // 检查ignore模式
    if (this.config.ignore) {
      for (const pattern of this.config.ignore) {
        if (this.matchPattern(filePath, pattern)) {
          return false
        }
      }
    }

    // 检查files模式
    if (this.config.files) {
      for (const pattern of this.config.files) {
        if (this.matchPattern(filePath, pattern)) {
          return true
        }
      }
      return false
    }

    return true
  }

  /**
   * 简单的glob模式匹配
   */
  private matchPattern(filePath: string, pattern: string): boolean {
    // 简化版的glob匹配，实际项目中可以使用minimatch库
    const normalizedPath = filePath.replace(/\\/g, '/')
    const normalizedPattern = pattern.replace(/\\/g, '/')

    // **/* 匹配任意目录下的任意文件
    if (normalizedPattern.includes('**/')) {
      // 特殊处理 **/dirname/** 的模式
      if (normalizedPattern.startsWith('**/') && normalizedPattern.endsWith('/**')) {
        // 提取中间的目录名
        const dirName = normalizedPattern.slice(3, -3) // 去掉前后的 **/
        // 匹配以该目录名开头或包含该目录的路径
        const patterns = [
          `^${dirName}/.*$`,        // 直接以目录名开头
          `.+/${dirName}/.*$`       // 在某个路径中包含该目录
        ]
        return patterns.some(p => new RegExp(p).test(normalizedPath))
      }
      
      // 其他 ** 模式的处理
      let regexPattern = normalizedPattern
        .replace(/\*\*/g, '.*')  // ** 匹配任意深度目录
        .replace(/\*/g, '[^/]*')  // * 匹配单层目录中的任意字符
        .replace(/\?/g, '[^/]')   // ? 匹配单个字符
      
      return new RegExp(`^${regexPattern}$`).test(normalizedPath)
    }

    // 简单的文件名匹配
    if (normalizedPattern.includes('*')) {
      const regexPattern = normalizedPattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
      return new RegExp(`^${regexPattern}$`).test(normalizedPath)
    }

    // 精确匹配或后缀匹配
    return normalizedPath === normalizedPattern || normalizedPath.endsWith(normalizedPattern)
  }

  /**
   * 重新加载配置
   */
  async reloadConfig(): Promise<void> {
    this.config = null
    this.formattingConfig = null
    this.configFilePath = null
    this.lastModified = 0
    await this.loadConfig()
  }
}