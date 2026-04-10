import { describe, expect } from 'vite-plus/test'
import { TopCommandParser } from '../src/frontend/utils/parse-top'

describe('parseTop', (it) => {
  it('should parse top command', async () => {
    const topCommandParser = new TopCommandParser()
    const output = `Tasks: 195 total,   1 running, 194 sleeping,   0 stopped,   0 zombie
Mem:    11638M total,    11034M used,      603M free,        0M buffers
Swap:     8192M total,     4739M used,     3452M free,     3832M cached
1200%cpu   63%user    0%nice   78%sys 1059%idle    0%iow    0%irq    0%sirq    0%host
PID USER         PR  NI VIRT  RES  SHR S[%CPU] %MEM     TIME+ ARGS
582 hiview       20   0 2.4G  67M  51M S 46.8   0.5  29:18.92 hiview
68 root         20   0  36G 124M  21M S 15.6   1.0 113:34.61 devhost.elf /lib/libdh-linux.so.5.10-oh --irqthread_affinity  --extensions /lib/extension/libdhext_net_socket.so:/lib/extension/libdhext_transfs.so.0:/lib/extension/libdhext_kstate.so.0:/lib/extension/libdhext_tracefs.so.0:/lib/extension/libdhext_iaware_notify.so.0:/lib/extension/libdhext_file_info.so.0 --total_poolcfg  --pools name=common,type=discrete,rsv=dyn,sizeorder=15,reclaimorder=15:name=pagecache,type=discrete,rsv=dyn,sizeorder=15,reclaimorder=15:name=dma,type=discrete,rsv=dyn,sizeorder=15,reclaimorder=15:name=rsv,type=discrete,rsv=dyn,sizeorder=15,reclaimorder=15,high_watermark=32,low_watermark=32 --isolate  --args  --pre_extensions /lib/extension/libdhext_hisi.so.0
63196 shell        20   0 2.0G 6.9M 6.1M R  9.3   0.0   0:00.09 top -b -n 1`
    const result = topCommandParser.parseTopCommand(output)
    await expect(result).toMatchFileSnapshot('fixtures/parse-top.json.snapshot')
  })
})
