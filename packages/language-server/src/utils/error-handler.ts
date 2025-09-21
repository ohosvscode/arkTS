import type { LanguageServerLogger } from '@arkts/shared'
import process from 'node:process'

/**
 * 全局错误处理器
 * 提供进程级别的错误处理，确保服务器稳定性
 */
export class GlobalErrorHandler {
  private static isInitialized = false

  /**
   * 初始化全局错误处理机制
   * @param logger 日志记录器
   */
  static initialize(logger: LanguageServerLogger): void {
    if (this.isInitialized) {
      return
    }

    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.getConsola().error('Uncaught exception in ETS Language Server:', error)
      // 不退出进程，让服务继续运行
    })

    // 处理未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      logger.getConsola().error('Unhandled promise rejection in ETS Language Server:', reason)
      // 记录具体的Promise信息以便调试
      if (reason instanceof Error) {
        logger.getConsola().error('Promise rejection stack:', reason.stack)
      }
      // 不退出进程，让服务继续运行
    })

    this.isInitialized = true
    logger.getConsola().info('Global error handler initialized successfully')
  }
}
