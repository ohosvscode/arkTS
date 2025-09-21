import type { LanguageServerLogger } from '@arkts/shared'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { SafeJson5Parser } from '../utils/json5-parser'

/**
 * TypeScript服务包装器
 * 提供安全的TypeScript服务创建和语言服务主机包装
 */
export class TypeScriptServiceWrapper {
  /**
   * 创建安全的TypeScript服务，包含错误处理
   * @param ets TypeScript实例
   * @param logger 日志记录器
   * @returns 包装后的TypeScript服务数组
   */
  static createSafeTypeScriptServices(ets: typeof import('ohos-typescript'), logger: LanguageServerLogger) {
    try {
      return createTypeScriptServices(ets as any)
    } catch (error) {
      logger.getConsola().error('Failed to create TypeScript services:', error)
      // 返回空数组，确保服务器能继续启动
      return []
    }
  }
  
  /**
   * 包装TypeScript语言服务主机的关键方法
   * 添加JSON5解析错误防护和文件访问拦截
   * @param languageServiceHost TypeScript语言服务主机
   * @param logger 日志记录器
   */
  static wrapLanguageServiceHost(languageServiceHost: any, logger: LanguageServerLogger): void {
    try {
      // 包装fileExists方法，过滤有问题的JSON5文件
      if (languageServiceHost.fileExists) {
        const originalFileExists = languageServiceHost.fileExists.bind(languageServiceHost)
        languageServiceHost.fileExists = (fileName: string) => {
          try {
            if (SafeJson5Parser.isProblematicJson5File(fileName)) {
              logger.getConsola().debug('Skipping potentially problematic JSON5 file in fileExists:', fileName)
              return false
            }
            return originalFileExists(fileName)
          } catch (error) {
            logger.getConsola().warn('Error in fileExists for:', fileName, error)
            return false
          }
        }
      }
      
      // 包装readFile方法，防止读取有问题的JSON5文件
      if (languageServiceHost.readFile) {
        const originalReadFile = languageServiceHost.readFile.bind(languageServiceHost)
        languageServiceHost.readFile = (fileName: string, encoding?: string) => {
          try {
            if (SafeJson5Parser.isProblematicJson5File(fileName)) {
              logger.getConsola().debug('Preventing read of potentially problematic JSON5 file:', fileName)
              return undefined
            }
            return originalReadFile(fileName, encoding)
          } catch (error) {
            logger.getConsola().warn('Error in readFile for:', fileName, error)
            return undefined
          }
        }
      }
      
      // 包装directoryExists方法，防止访问有问题的目录
      if (languageServiceHost.directoryExists) {
        const originalDirectoryExists = languageServiceHost.directoryExists.bind(languageServiceHost)
        languageServiceHost.directoryExists = (directoryName: string) => {
          try {
            return originalDirectoryExists(directoryName)
          } catch (error) {
            logger.getConsola().warn('Error in directoryExists for:', directoryName, error)
            return false
          }
        }
      }
      
      // 包装getDirectories方法，过滤有问题的目录
      if (languageServiceHost.getDirectories) {
        const originalGetDirectories = languageServiceHost.getDirectories.bind(languageServiceHost)
        languageServiceHost.getDirectories = (directoryName: string) => {
          try {
            return originalGetDirectories(directoryName)
          } catch (error) {
            logger.getConsola().warn('Error in getDirectories for:', directoryName, error)
            return []
          }
        }
      }
      
      logger.getConsola().debug('TypeScript language service host wrapped successfully')
    } catch (error) {
      logger.getConsola().error('Failed to wrap language service host:', error)
    }
  }
}