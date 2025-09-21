import type { LanguageServerLogger } from '@arkts/shared'
import { URI } from 'vscode-uri'

/**
 * URI解析工具类
 * 提供安全的URI解析功能，处理特殊字符和编码问题
 */
export class UriHelper {
  /**
   * 安全的URI解析函数，处理特殊字符和编码问题
   * @param uri URI字符串
   * @param logger 日志记录器
   * @returns 文件路径，如果解析失败则返回undefined
   */
  static safeParseUri(uri: string, logger: LanguageServerLogger): string | undefined {
    try {
      const decoded = URI.parse(uri)
      const fsPath = decoded.fsPath
      
      // 检查路径是否有效，避免处理特殊文件
      if (!fsPath || fsPath.includes('%') || fsPath.length < 3) {
        logger.getConsola().debug('Invalid file path after URI parsing:', fsPath)
        return undefined
      }
      
      return fsPath
    } catch (error) {
      logger.getConsola().warn('Failed to parse URI:', uri, error)
      return undefined
    }
  }
  
  /**
   * 检查文件路径是否为依赖文件
   * @param filePath 文件路径
   * @returns 是否为依赖文件
   */
  static isDependencyFile(filePath: string): boolean {
    return filePath.includes('oh_modules') || filePath.includes('node_modules')
  }
  
  /**
   * 检查文件路径是否为配置文件
   * @param filePath 文件路径
   * @returns 是否为配置文件
   */
  static isConfigFile(filePath: string): boolean {
    return filePath.endsWith('.json5') || filePath.endsWith('.json')
  }
}