import child_process from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { LanguageServerLogger } from '@arkts/shared'

const logger = new LanguageServerLogger()

const cp = child_process.fork(path.join(__dirname, 'server.js'), ['--node-ipc'], {
  execArgv: [],
  stdio: ['inherit', 'pipe', 'pipe', 'ipc'],
})

if (cp.stdin) process.stdin.pipe(cp.stdin)
cp.stdout?.pipe(process.stdout)
cp.stderr?.pipe(process.stderr)
cp.on('message', (message) => {
  logger.getConsola().info(`LSP -> Editor: ${JSON.stringify(message)}`)
  process.send?.(message)
})
process.on('message', (message: child_process.Serializable) => {
  logger.getConsola().info(`Editor -> LSP: ${JSON.stringify(message)}`)
  cp.send(message)
})
