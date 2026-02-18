import type { Arrayable } from '@vueuse/core'
import * as child_process from 'node:child_process'
import { Autowired, Service } from 'unioc'
import * as vscode from 'vscode'
import { HdcManager } from './hdc-manager'

@Service
export class HilogController {
  @Autowired
  private readonly hdcManager: HdcManager

  private outputChannel = vscode.window.createOutputChannel('Hilog', 'log')
  private child_process: child_process.ChildProcess | undefined
  private logLevel: Arrayable<'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'> | undefined
  private connectKey: string | undefined

  async setLogLevel(logLevel: Arrayable<'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'>, connectKey: string): Promise<void> {
    // 已在同一设备、同一级别运行则不要 kill/重启，避免设备列表短暂为空又恢复时误杀进程
    if (this.child_process && this.connectKey === connectKey && this.logLevel === logLevel) return
    if (this.child_process) {
      this.connectKey = undefined
      this.outputChannel.clear()
      this.child_process.kill()
      this.child_process = undefined
    }
    this.logLevel = logLevel
    this.connectKey = connectKey
    const hdcPath = await this.hdcManager.getHdcPath()
    if (!hdcPath) {
      this.outputChannel.appendLine(`[ERROR:${connectKey}] HDC path not found`)
      return
    }
    const args = ['-t', connectKey, 'shell', 'hilog', '-L', Array.isArray(logLevel) ? logLevel.join(',') : logLevel]
    this.outputChannel.appendLine(`[INFO:${connectKey}] Executing: ${hdcPath} ${args.join(' ')}`)
    // 使用 spawn 而非 exec：exec() 会缓冲全部 stdout/stderr，超过 maxBuffer（默认约 1MB）时 Node 会发 SIGTERM 杀进程；hilog 持续输出会触发
    this.child_process = child_process.spawn(hdcPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    this.child_process.stdout?.on('data', chunk => this.outputChannel.append(chunk.toString()))
    this.child_process.stderr?.on('data', chunk => this.outputChannel.append(chunk.toString()))
    this.child_process.on('close', (code, signal) => this.outputChannel.appendLine(`[WARNING:${connectKey}] Hilog closed with code ${code} ${signal ? `and signal ${signal}` : ''}`))
  }

  getLogLevel(): Arrayable<'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'> | undefined {
    return this.logLevel
  }

  getConnectKey(): string | undefined {
    return this.connectKey
  }

  async openHilog(): Promise<void> {
    this.outputChannel.show()
  }
}
