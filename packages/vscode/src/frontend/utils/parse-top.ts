import { Service } from 'unioc'
import { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'

@Service
export class TopCommandParser {
  parseMemInfo(line: string = ''): HdcManagerConnectionProtocol.ServerFunction.GetProcesses.Memory {
    try {
      const [total, used, free, buffers] = line.trim()
        .split('Mem:')?.[1]
        ?.trim()
        ?.split(',')
        ?.map(item => item?.trim()?.split(' ')?.[0]?.replace(/M$/, '') ?? '')
        ?.map(Number) ?? []

      return {
        total,
        used,
        free,
        buffers,
      }
    }
    catch {
      return HdcManagerConnectionProtocol.ServerFunction.GetProcesses.defaultMemory
    }
  }

  parseSwapInfo(line: string = ''): HdcManagerConnectionProtocol.ServerFunction.GetProcesses.Swap {
    try {
      const [total, used, free, cached] = line.trim()
        .split('Swap:')?.[1]
        ?.trim()
        ?.split(',')
        .map(item => item.trim().split(' ')?.[0].replace(/M$/, ''))
        .map(Number)

      return {
        total,
        used,
        free,
        cached,
      }
    }
    catch {
      return HdcManagerConnectionProtocol.ServerFunction.GetProcesses.defaultSwap
    }
  }

  private normalizeSpaces(input: string = '', maxReplacements: number = Infinity): string[] {
    // 首先去掉两端的空格
    const trimmedInput = input.trim()

    let replacements = 0

    // 用正则表达式替换多个空格为单个空格，限制替换次数
    const normalized = trimmedInput.replace(/\s+/g, (match) => {
      if (replacements < maxReplacements) {
        replacements++
        return ' '
      }
      return match // 如果替换次数已达上限，直接返回原匹配的空格
    })

    // 将规范化后的字符串按单个空格分割成数组
    return normalized.split(' ')
  }

  parseCpuLine(line: string = ''): HdcManagerConnectionProtocol.ServerFunction.GetProcesses.CPU {
    try {
      const [cpuTotal, cpuUser,, cpuSys, cpuIdle, cpuIoWait, cpuIrq, cpuSoftIrq, cpuHost] = this.normalizeSpaces(line)
        .map(item => item.split('%'))

      return {
        total: Number(cpuTotal?.[0]),
        user: Number(cpuUser?.[0]),
        system: Number(cpuSys?.[0]),
        idle: Number(cpuIdle?.[0]),
        ioWait: Number(cpuIoWait?.[0]),
        irq: Number(cpuIrq?.[0]),
        softIrq: Number(cpuSoftIrq?.[0]),
        host: Number(cpuHost?.[0]),
      }
    }
    catch {
      return HdcManagerConnectionProtocol.ServerFunction.GetProcesses.defaultCPU
    }
  }

  parseProcesses(lines: string[] = []): HdcManagerConnectionProtocol.ServerFunction.GetProcesses.Process[] {
    try {
      return lines.map((line) => {
        const [pid, user, priority, nice, virt, res, shr, status, cpu, mem, time, ...command] = this.normalizeSpaces(line, 10)

        return {
          pid: Number(pid),
          user: user ?? '',
          priority: Number(priority),
          nice: Number(nice),
          virt,
          res,
          shr,
          status: status ?? '',
          cpu: Number(cpu),
          mem: Number(mem),
          time: time ?? '',
          command: command?.join(' ') ?? '',
        }
      })
    }
    catch {
      return []
    }
  }

  parseTasks(line: string = ''): HdcManagerConnectionProtocol.ServerFunction.GetProcesses.Task {
    try {
      const parsedData = line.replace(/Tasks:/, '').trim().split(',').map(item => item.trim().split(' ') as [string, string])

      return {
        total: Number(parsedData[0]?.[0]),
        running: Number(parsedData[1]?.[0]),
        sleeping: Number(parsedData[2]?.[0]),
        stopped: Number(parsedData[3]?.[0]),
        zombie: Number(parsedData[4]?.[0]),
      }
    }
    catch {
      return HdcManagerConnectionProtocol.ServerFunction.GetProcesses.defaultTask
    }
  }

  parseTopCommand(output: string = ''): HdcManagerConnectionProtocol.ServerFunction.GetProcesses.Response {
    try {
      const processes = output
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)

      return {
        tasks: this.parseTasks(processes[0] ?? ''),
        memory: this.parseMemInfo(processes[1] ?? ''),
        swap: this.parseSwapInfo(processes[2] ?? ''),
        cpu: this.parseCpuLine(processes[3] ?? ''),
        processes: this.parseProcesses(processes.slice(5) ?? []),
      }
    }
    catch {
      return HdcManagerConnectionProtocol.ServerFunction.GetProcesses.defaultResponse
    }
  }
}
