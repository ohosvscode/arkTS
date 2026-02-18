/**
 * 解析 Linux / 鸿蒙设备 ifconfig 输出为固定结构。
 * 兼容格式示例：
 *   wlan0     Link encap:Ethernet  HWaddr 42:26:ce:07:9d:7e
 *             inet addr:192.168.10.81  Bcast:192.168.10.255  Mask:255.255.255.0
 *             UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
 *             RX packets:2863368 errors:0 dropped:719 ...
 *             TX packets:753086 ...
 *             RX bytes:3841709274 TX bytes:227750642
 */

export interface ParsedIfconfig {
  /** 接口名，如 wlan0、lo */
  name: string
  /** Link encap 类型，如 Ethernet、Local Loopback */
  linkEncap: string
  /** MAC 地址，无则为空字符串 */
  hwaddr: string
  /** IPv4 地址，无则为 undefined */
  inet?: string
  /** 子网掩码，无则为 undefined */
  mask?: string
  /** 广播地址，无则为 undefined */
  broadcast?: string
  /** 是否 UP */
  up: boolean
  /** MTU，未解析到为 0 */
  mtu: number
  /** 首行或后续行中的状态标志，如 UP、RUNNING、BROADCAST */
  flags: string[]
  /** 接收字节数 */
  rxBytes: number
  /** 发送字节数 */
  txBytes: number
  /** 接收包数 */
  rxPackets: number
  /** 发送包数 */
  txPackets: number
}

const RE_FIRST_LINE = /^(\S+)\s+Link encap:(\S+)(?:\s+HWaddr\s+([0-9a-fA-F:]+))?/
const RE_INET_ADDR = /inet addr:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/
const RE_MASK = /Mask:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/
const RE_BCAST = /Bcast:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/
const RE_MTU = /MTU:(\d+)/i
const RE_RX_BYTES = /RX bytes:(\d+)/
const RE_TX_BYTES = /TX bytes:(\d+)/
const RE_RX_PACKETS = /RX packets:(\d+)/
const RE_TX_PACKETS = /TX packets:(\d+)/

function defaultInterface(name: string): ParsedIfconfig {
  return {
    name,
    linkEncap: '',
    hwaddr: '',
    up: false,
    mtu: 0,
    flags: [],
    rxBytes: 0,
    txBytes: 0,
    rxPackets: 0,
    txPackets: 0,
  }
}

/**
 * 将 ifconfig 原始输出解析为网卡列表（固定结构）。
 * @param src - ifconfig 完整输出
 * @returns 网卡数组，每项结构固定，便于 TypeScript 使用
 */
export function parseIfconfig(src: string): ParsedIfconfig[] {
  const lines = src.split(/\r?\n/)
  const blocks: string[][] = []
  let current: string[] = []

  for (const line of lines) {
    const isNewBlock = line.length > 0 && line[0] !== ' ' && line[0] !== '\t'
    if (isNewBlock && current.length > 0) {
      blocks.push(current)
      current = []
    }
    current.push(line)
  }
  if (current.length > 0) blocks.push(current)

  return blocks.map(block => parseBlock(block))
}

function parseBlock(block: string[]): ParsedIfconfig {
  if (block.length === 0) return defaultInterface('')

  const first = block[0]
  const firstMatch = first.match(RE_FIRST_LINE)
  const name = firstMatch ? firstMatch[1].trim() : first.split(/\s+/)[0]?.trim() ?? ''
  const iface = defaultInterface(name)
  if (firstMatch) {
    iface.linkEncap = firstMatch[2] ?? ''
    iface.hwaddr = firstMatch[3] ?? ''
  }

  const rest = block.slice(1)
  for (const line of rest) {
    const inetAddr = line.match(RE_INET_ADDR)
    if (inetAddr) iface.inet = inetAddr[1]

    const mask = line.match(RE_MASK)
    if (mask) iface.mask = mask[1]

    const bcast = line.match(RE_BCAST)
    if (bcast) iface.broadcast = bcast[1]

    const mtu = line.match(RE_MTU)
    if (mtu) iface.mtu = Number.parseInt(mtu[1], 10)

    if (/\bUP\b/.test(line)) iface.up = true
    const flags = line.match(/\b(UP|BROADCAST|RUNNING|MULTICAST|LOOPBACK|NOARP|POINTOPOINT)\b/g)
    if (flags) iface.flags.push(...flags)

    const rxBytes = line.match(RE_RX_BYTES)
    if (rxBytes) iface.rxBytes = Number.parseInt(rxBytes[1], 10)
    const txBytes = line.match(RE_TX_BYTES)
    if (txBytes) iface.txBytes = Number.parseInt(txBytes[1], 10)
    const rxPackets = line.match(RE_RX_PACKETS)
    if (rxPackets) iface.rxPackets = Number.parseInt(rxPackets[1], 10)
    const txPackets = line.match(RE_TX_PACKETS)
    if (txPackets) iface.txPackets = Number.parseInt(txPackets[1], 10)
  }

  iface.flags = [...new Set(iface.flags)]
  return iface
}
