import process from 'node:process'
import { LanguageServerLogger } from '@arkts/shared'
import * as ets from 'ohos-typescript'

export const logger = new LanguageServerLogger({
  console: process.argv.includes('--node-ipc'),
  file: process.argv.includes('--stdio'),
})
logger.getConsola().info(`ohos-typescript version: ${ets.version}`)
