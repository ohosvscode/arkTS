import type { LanguageServerLogger } from '@arkts/shared'

/**
 * 安全的JSON5解析工具
 * 防止解析错误导致服务器崩溃
 */
export class SafeJson5Parser {
  private static isInitialized = false

  /**
   * 初始化安全的JSON5解析器
   * 包装原生JSON5.parse方法，添加错误处理和内容验证
   * @param logger 日志记录器
   */
  static initialize(logger: LanguageServerLogger): void {
    if (this.isInitialized) {
      return
    }

    try {
      const json5 = require('json5')
      if (json5 && json5.parse) {
        const originalParse = json5.parse
        json5.parse = function (text: string, reviver?: any) {
          try {
            // 检查文本是否包含可能导致问题的字符
            if (!text || typeof text !== 'string') {
              throw new Error('Invalid JSON5 text')
            }

            // 过滤明显无效的JSON5内容
            const trimmedText = text.trim()
            if (trimmedText.length === 0 || trimmedText.startsWith('u') || (!trimmedText.startsWith('{') && !trimmedText.startsWith('[') && !trimmedText.startsWith('"'))) {
              logger.getConsola().debug('Skipping invalid JSON5 content:', trimmedText.substring(0, 50))
              throw new Error('Invalid JSON5 format')
            }

            return originalParse.call(this, text, reviver)
          }
          catch (error: any) {
            logger.getConsola().warn('JSON5 parsing failed, returning empty object:', error.message)
            return {}
          }
        }

        this.isInitialized = true
        logger.getConsola().info('Safe JSON5 parser initialized successfully')
      }
    }
    catch (error) {
      logger.getConsola().warn('Failed to setup safe JSON5 parser:', error)
    }
  }

  /**
   * 检查文件是否为有问题的JSON5文件
   * @param fileName 文件名或路径
   * @returns 是否为有问题的JSON5文件
   */
  static isProblematicJson5File(fileName: string): boolean {
    if (!fileName)
      return false
    const normalizedPath = fileName.replace(/\\/g, '/')
    return (
      (normalizedPath.includes('oh_modules') || normalizedPath.includes('node_modules'))
      && (normalizedPath.endsWith('.json5') || normalizedPath.endsWith('oh-package.json5') || normalizedPath.endsWith('package.json5'))
    )
  }
}
