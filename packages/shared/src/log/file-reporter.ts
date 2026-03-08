import type { ConsolaOptions, ConsolaReporter, LogObject } from 'consola'
import fs from 'node:fs'
import path from 'node:path'

export class FileReporter implements ConsolaReporter {
  constructor(private readonly debug: boolean, private readonly prefix: string, private readonly filename: string) {}

  private safeStringify<T>(value: T): string {
    try {
      return JSON.stringify(value)
    }
    catch {
      return String(value)
    }
  }

  private toString(logObj: LogObject): string {
    if (logObj.message) return logObj.message
    if (logObj.args.length === 0) return this.safeStringify(logObj)
    return logObj.args.join(' ')
  }

  private getPrefix(): string {
    if (this.prefix) return `<${this.prefix}>`
    return ''
  }

  log(logObj: LogObject, _ctx: { options: ConsolaOptions }): void {
    if (!fs.existsSync(path.dirname(this.filename))) fs.mkdirSync(path.dirname(this.filename), { recursive: true })
    switch (logObj.type) {
      case 'log':
        fs.appendFileSync(this.filename, `[${logObj.type.toUpperCase()}] 📅:${logObj.tag} ${this.getPrefix()} ${logObj.date.toLocaleString()} ${this.toString(logObj)}\r\n`)
        break
      case 'warn':
        fs.appendFileSync(this.filename, `[${logObj.type.toUpperCase()}] ⚠️:${logObj.tag} ${this.getPrefix()} ${logObj.date.toLocaleString()} ${this.toString(logObj)}\r\n`)
        break
      case 'info':
        fs.appendFileSync(this.filename, `[${logObj.type.toUpperCase()}] 🔥:${logObj.tag} ${this.getPrefix()} ${logObj.date.toLocaleString()} ${this.toString(logObj)}\r\n`)
        break
      case 'success':
      case 'ready':
      case 'start':
        fs.appendFileSync(this.filename, `[${logObj.type.toUpperCase()}] ✅:${logObj.tag} ${this.getPrefix()} ${logObj.date.toLocaleString()} ${this.toString(logObj)}\r\n`)
        break
      case 'fail':
      case 'fatal':
      case 'error':
        fs.appendFileSync(this.filename, `[${logObj.type.toUpperCase()}] ❌:${logObj.tag} ${this.getPrefix()} ${logObj.date.toLocaleString()} ${this.toString(logObj)}\r\n`)
        break
      case 'debug':
      case 'verbose':
      case 'trace':
        if (!this.debug) return
        fs.appendFileSync(this.filename, `[${logObj.type.toUpperCase()}] 🐛:${logObj.tag} ${this.getPrefix()} ${logObj.date.toLocaleString()} ${this.toString(logObj)}\r\n`)
        break
      case 'box':
        fs.appendFileSync(this.filename, `[${logObj.type.toUpperCase()}] 📦:${logObj.tag} ${this.getPrefix()} ${logObj.date.toLocaleString()} ${this.toString(logObj)}\r\n`)
        break
    }
  }
}
