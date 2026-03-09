import type { Arrayable } from '@vueuse/core'
import child_process from 'node:child_process'
import hbs from 'handlebars'
import { Autowired, Service } from 'unioc'
import { ExtensionContext, Translator } from 'unioc/vscode'
import * as vscode from 'vscode'
import { ProtocolContext } from '../../context/protocol-context'
import { commands } from '../../generated/meta'
import { HdcManager } from '../../hdc-manager'
import { HilogController } from '../../hilog'
import { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'
import { parseIfconfig } from '../utils/parse-ifconfig'

hbs.registerHelper('equal', (a: number | string, b: number | string) => Number(a) === Number(b) || String(a) === String(b))

@Service
export class HdcServerFunctionImpl extends ProtocolContext<HdcManagerConnectionProtocol.ClientFunction, HdcManagerConnectionProtocol.ServerFunction> implements HdcManagerConnectionProtocol.ServerFunction {
  @Autowired(Translator) protected readonly translator: Translator
  @Autowired protected readonly hdcManager: HdcManager
  @Autowired(ExtensionContext) protected readonly extensionContext: vscode.ExtensionContext
  @Autowired private readonly hilogController: HilogController

  async getHdcPath(): Promise<string | null> {
    return this.hdcManager.getHdcPath()
  }

  async setCurrentConnectKey(connectKey: string | -1): Promise<void> {
    this.hdcManager.setCurrentConnectKey(connectKey)
  }

  async getConnectedDevices(): Promise<HdcManagerConnectionProtocol.ServerFunction.GetConnectedDevices.Response> {
    const hdcPath = await this.getHdcPath()
    if (!hdcPath) return { devices: [] }
    const output = child_process.execFileSync(hdcPath, ['list', 'targets'], { encoding: 'utf-8' }).trim()
    if (output === '[Empty]') return { devices: [] }

    const devices: HdcManagerConnectionProtocol.ServerFunction.GetConnectedDevices.Device[] = []

    for (const connectKey of output.split('\n')) {
      if (connectKey.trim() === '') continue
      devices.push({ connectKey })
    }

    return { devices }
  }

  async getDeviceInfo(connectKey: string): Promise<HdcManagerConnectionProtocol.ServerFunction.GetDeviceInfo.Response> {
    const hdcPath = await this.getHdcPath()
    if (!hdcPath) return HdcManagerConnectionProtocol.ServerFunction.GetDeviceInfo.defaultResponse
    const output = child_process.execFileSync(
      hdcPath,
      ['-t', connectKey, 'shell', '"top -n 1 -b" 2>/dev/null | awk \'BEGIN{cached_kb=0} /Mem:/{if($2~/^[0-9]+[MK]$/){t=$2;u=$4;f=$6}else{t=$3;u=$5;f=$7} mem_total=t+0;mem_used=u+0;mem_free=f+0; if(t~/M$/){mem_total*=1024;mem_used*=1024;mem_free*=1024}} /Swap:/{for(i=2;i<NF;i++)if($(i+1)=="cached"){c=$i;cached_kb=c+0;if(c~/M$/)cached_kb*=1024;break}} /%cpu/&&/%user/{split($1,a,"%");total_cpu=a[1]+0;user=0+substr($2,1,index($2,"%")-1);nice=0+substr($3,1,index($3,"%")-1);sys=0+substr($4,1,index($4,"%")-1);idle=0+substr($5,1,index($5,"%")-1);cpu_used_pct=(total_cpu>0)?(user+nice+sys)/total_cpu*100:0} END{real_used=mem_total-mem_free-cached_kb;if(real_used<0)real_used=0;mem_pct=(mem_total>0)?real_used/mem_total*100:0;idle_pct=(total_cpu>0)?idle/total_cpu*100:0; printf "%d %d %d %.2f %.2f %.2f", mem_total, mem_used, mem_free, mem_pct, cpu_used_pct, idle_pct}'],
      { encoding: 'utf-8' },
    )
      .trim()
    if (output === '') return HdcManagerConnectionProtocol.ServerFunction.GetDeviceInfo.defaultResponse
    const parts = output.split(/\s+/)
    if (parts.length < 6) return HdcManagerConnectionProtocol.ServerFunction.GetDeviceInfo.defaultResponse
    const memPct = Number(parts[3])
    const cpuPct = Number(parts[4])

    const [apiVersion, cpuAbilist, model, brand, osDistName, productName, incrementalVersion, fullName] = child_process.execSync([
      `${hdcPath} -t ${connectKey} shell param get const.ohos.apiversion`,
      `${hdcPath} -t ${connectKey} shell param get const.product.cpu.abilist`,
      `${hdcPath} -t ${connectKey} shell param get const.product.model`,
      `${hdcPath} -t ${connectKey} shell param get const.product.brand`,
      `${hdcPath} -t ${connectKey} shell param get const.product.os.dist.name`,
      `${hdcPath} -t ${connectKey} shell param get const.product.name`,
      `${hdcPath} -t ${connectKey} shell param get const.product.incremental.version`,
      `${hdcPath} -t ${connectKey} shell param get const.ohos.fullname`,
    ].join('\n'), { encoding: 'utf-8' })
      .trim()
      .split('\n')

    const batteryService = child_process.execSync(`${hdcPath} -t ${connectKey} shell "hidumper -s BatteryService -a '-i'"`, { encoding: 'utf-8' }).trim()
    const batteryCapacity = batteryService.match(/capacity:\s*(\d+)/)?.[1] || '0'
    const batteryVoltage = batteryService.match(/voltage:\s*(\d+)/)?.[1] || '0'
    const batteryTemperature = batteryService.match(/temperature:\s*(\d+)/)?.[1] || '0'
    const batteryNowCurrent = batteryService.match(/nowCurrent:\s*(\d+)/)?.[1] || '0'
    const batteryTotalEnergy = batteryService.match(/totalEnergy:\s*(\d+)/)?.[1] || '0'
    const batteryRemainingEnergy = batteryService.match(/remainingEnergy:\s*(\d+)/)?.[1] || '0'
    const batteryRemainingChargeTime = batteryService.match(/remainingChargeTime:\s*(\d+)/)?.[1] || '0'
    const batteryStatus = batteryService.match(/chargingStatus:\s*(\d+)/)?.[1] || '0'

    const ifconfig = child_process.execSync(`${hdcPath} -t ${connectKey} shell "ifconfig -a"`, { encoding: 'utf-8' }).trim()
    const network = parseIfconfig(ifconfig)

    let storageUsage = 0
    try {
      // 实体机对 df / 可能报 Permission denied，使用无参数的 df 读取只读挂载表（不访问具体路径）
      const dfOutput = child_process.execSync(`${hdcPath} -t ${connectKey} shell "df"`, { encoding: 'utf-8' }).trim()
      if (!dfOutput.includes('Permission denied')) {
        const dfLines = dfOutput.split('\n').filter(line => line.trim() !== '')
        for (let i = 1; i < dfLines.length; i++) {
          const parts = dfLines[i].trim().split(/\s+/)
          const mountPoint = parts[parts.length - 1]
          if (mountPoint !== '/' && mountPoint !== '/data') continue
          const usePctStr = parts[parts.length - 2]
          if (usePctStr?.endsWith('%')) storageUsage = Number.parseFloat(usePctStr.slice(0, -1)) || 0
          else storageUsage = Number.parseFloat(usePctStr) || 0
          break
        }
      }
    }
    catch {
      // df 可能不可用或仍被限制
    }

    return {
      cpuUsage: Number.isFinite(cpuPct) ? cpuPct : 0,
      memoryUsage: Number.isFinite(memPct) ? memPct : 0,
      storageUsage: Number.isFinite(storageUsage) ? storageUsage : 0,
      apiVersion,
      cpuAbilist,
      model,
      brand,
      osDistName,
      productName,
      incrementalVersion,
      fullName,
      batteryCapacity: Number.parseInt(batteryCapacity, 10),
      batteryVoltage: Number.isFinite(Number.parseFloat(batteryVoltage)) ? Number.parseFloat(batteryVoltage) : 0,
      batteryTemperature: Number.isFinite(Number.parseFloat(batteryTemperature)) ? Number.parseFloat(batteryTemperature) : 0,
      batteryNowCurrent: Number.isFinite(Number.parseFloat(batteryNowCurrent)) ? Number.parseFloat(batteryNowCurrent) : 0,
      batteryTotalEnergy: Number.isFinite(Number.parseInt(batteryTotalEnergy, 10)) ? Number.parseInt(batteryTotalEnergy, 10) : 0,
      batteryRemainingEnergy: Number.isFinite(Number.parseInt(batteryRemainingEnergy, 10)) ? Number.parseInt(batteryRemainingEnergy, 10) : 0,
      batteryRemainingChargeTime: Number.isFinite(Number.parseInt(batteryRemainingChargeTime, 10)) ? Number.parseInt(batteryRemainingChargeTime, 10) : 0,
      batteryTechnology: batteryService.match(/technology:\s*(\w+)/)?.[1] || '',
      batteryStatus: Number.isFinite(Number.parseInt(batteryStatus, 10)) ? (Number.parseInt(batteryStatus, 10) as 0 | 1) : 0,
      network,
    }
  }

  setLogLevel(logLevel: Arrayable<'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'>, connectKey: string): Promise<void> {
    return this.hilogController.setLogLevel(logLevel, connectKey)
  }

  openHilog(): Promise<void> {
    return this.hilogController.openHilog()
  }

  async openConnectDeviceDialog(): Promise<void> {
    const connectByIPTitle = this.translator.t('hdcManager.connectDeviceDialog.connectByIP.title')
    const connectByIPDetail = this.translator.t('hdcManager.connectDeviceDialog.connectByIP.detail')
    const openDeviceManagerTitle = this.translator.t('hdcManager.connectDeviceDialog.openDeviceManager.title')
    const openDeviceManagerDetail = this.translator.t('hdcManager.connectDeviceDialog.openDeviceManager.detail')
    const dialog = await vscode.window.showQuickPick([
      { label: connectByIPTitle, iconPath: new vscode.ThemeIcon('globe'), detail: connectByIPDetail },
      { label: openDeviceManagerTitle, iconPath: new vscode.ThemeIcon('device-desktop'), detail: openDeviceManagerDetail },
    ])
    if (!dialog) return
    if (dialog.label === connectByIPTitle) {
      const ip = await vscode.window.showInputBox({
        title: connectByIPTitle,
        prompt: this.translator.t('hdcManager.connectDeviceDialog.connectByIP.prompt'),
        placeHolder: this.translator.t('hdcManager.connectDeviceDialog.connectByIP.placeholder'),
      })
      if (!ip) return
      const hdcPath = await this.getHdcPath()
      if (!hdcPath) return
      vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: this.translator.t('connectingWithDot') }, async () => {
        const output = child_process.execSync(`${hdcPath} tconn ${ip}`, { encoding: 'utf-8' }).trim()
        if (output === 'Connect OK') vscode.window.showInformationMessage(this.translator.t('hdcManager.connectDeviceDialog.connectByIP.success', ip))
        else vscode.window.showErrorMessage(this.translator.t('hdcManager.connectDeviceDialog.connectByIP.error', ip, output))
      })
    }
    else if (dialog.label === openDeviceManagerTitle) {
      vscode.commands.executeCommand(commands.etsOpenDeviceManager)
    }
  }

  async disconnectDevice(connectKey: string): Promise<void> {
    const yes = this.translator.t('yes')
    const res = await vscode.window.showInformationMessage(`是否要断开设备${connectKey}连接? 注意: 如果是本地启动的模拟器设备, 断开连接的操作可能是无效的。`, { modal: true }, yes)
    if (res === yes) {
      const hdcPath = await this.getHdcPath()
      if (!hdcPath) return
      const disconnectedMessage = child_process.execSync(`${hdcPath} tconn ${connectKey} -remove`, { encoding: 'utf-8' }).trim()
      console.warn(`${connectKey} disconnected: ${disconnectedMessage}`)
    }
  }
}
