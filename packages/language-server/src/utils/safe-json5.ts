// 针对JSON5解析错误的特殊处理补丁
// 此文件用于拦截和处理TypeScript编译器的JSON5解析错误

import { logger } from '../logger'

// 声明全局JSON5类型以避免TypeScript错误
declare global {
  var JSON5: {
    parse(text: string, reviver?: any): any
    stringify(value: any, replacer?: any, space?: any): string
  } | undefined
}

/**
 * 创建一个安全的JSON5解析包装器
 */
export function createSafeJson5Parser() {
  try {
    // 检查是否存在JSON5对象
    if (typeof global !== 'undefined' && global.JSON5 && typeof global.JSON5.parse === 'function') {
      // 保存原始的JSON5.parse方法
      const originalJson5Parse = global.JSON5.parse

      // 重写JSON5.parse方法以添加错误处理
      global.JSON5.parse = function (text: string, reviver?: any) {
        try {
          return originalJson5Parse.call(global.JSON5, text, reviver)
        }
        catch (error) {
          if (error instanceof Error && error.message.includes('invalid character')) {
            logger.getConsola().warn('JSON5解析错误被安全拦截:', error.message)
            logger.getConsola().warn('文件内容可能损坏，返回空对象以保持服务稳定')
            return {} // 返回空对象以避免崩溃
          }
          throw error // 重新抛出其他错误
        }
      }

      logger.getConsola().info('JSON5.parse方法已被安全包装')
    }
    else {
      logger.getConsola().warn('JSON5对象不存在，无法应用安全包装')
    }
  }
  catch (error) {
    logger.getConsola().error('创建安全JSON5解析器时发生错误:', error)
  }
}

/**
 * 初始化安全JSON5解析器
 */
export function initSafeJson5() {
  try {
    // 在模块加载时立即应用补丁
    createSafeJson5Parser()

    logger.getConsola().info('Safe JSON5 parser initialized')
  }
  catch (error) {
    logger.getConsola().error('初始化安全JSON5解析器时发生错误:', error)
  }
}
