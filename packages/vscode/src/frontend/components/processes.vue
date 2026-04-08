<script setup lang="ts">
import type { DataTableColumn } from 'naive-ui'
import { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'

const { onLoop } = useHdcLoop()
const topInfo = ref<HdcManagerConnectionProtocol.ServerFunction.GetProcesses.Response>(HdcManagerConnectionProtocol.ServerFunction.GetProcesses.defaultResponse)
const columns = ref<DataTableColumn[]>([
  { key: 'pid', title: 'PID', minWidth: 100 },
  { key: 'user', title: '用户', minWidth: 150 },
  { key: 'priority', title: '优先级', minWidth: 100 },
  { key: 'nice', title: 'nice', minWidth: 100 },
  { key: 'virt', title: '虚拟内存', minWidth: 100 },
  { key: 'res', title: '物理内存', minWidth: 100 },
  { key: 'shr', title: '共享内存', minWidth: 100 },
  { key: 'status', title: '状态', minWidth: 50 },
  { key: 'cpu', title: 'CPU', minWidth: 100 },
  { key: 'mem', title: '内存', minWidth: 100 },
  { key: 'time', title: '时间', minWidth: 100 },
  { key: 'command', title: '命令', minWidth: 100 },
])
const { connection } = useHdcConnection()
const currentDevice = inject<Ref<string | undefined>>('currentDevice')
const isLoading = ref(true)

async function fetchProcesses() {
  try {
    if (!currentDevice?.value) return
    topInfo.value = await connection?.getProcesses?.(currentDevice.value) ?? HdcManagerConnectionProtocol.ServerFunction.GetProcesses.defaultResponse
  }
  finally {
    isLoading.value = false
  }
}
fetchProcesses()
onLoop(async () => await fetchProcesses())

const cpuUsage = computed(() => topInfo.value.cpu.user + topInfo.value.cpu.system + topInfo.value.cpu.ioWait + topInfo.value.cpu.irq + topInfo.value.cpu.softIrq + topInfo.value.cpu.host)
const cpuPercentage = computed(() => (cpuUsage.value / topInfo.value.cpu.total) * 100)
const memoryUsage = computed(() => topInfo.value.memory.used / topInfo.value.memory.total * 100)
const swapUsage = computed(() => topInfo.value.swap.used / topInfo.value.swap.total * 100)
</script>

<template>
  <div>
    <NCard size="small" content-class="p-1! px-2! grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4!" class="my-2">
      <NStatistic label="CPU利用率">
        <template #suffix>%</template>
        <NumberAnimationEffect :to="Number.isNaN(cpuPercentage) ? 0 : cpuPercentage" :precision="2" :duration="200" />
      </NStatistic>
      <NStatistic label="内存利用率">
        <template #suffix>%</template>
        <NumberAnimationEffect :to="Number.isNaN(memoryUsage) ? 0 : memoryUsage" :precision="2" :duration="200" />
      </NStatistic>
      <NStatistic label="交换区利用率">
        <template #suffix>%</template>
        <NumberAnimationEffect :to="Number.isNaN(swapUsage) ? 0 : swapUsage" :precision="2" :duration="200" />
      </NStatistic>
      <div class="flex gap-6 items-center">
        <NStatistic label="总任务数">
          <NumberAnimationEffect :to="topInfo.tasks.total" :precision="0" :duration="200" />
        </NStatistic>
        <div class="text-sm flex flex-col gap-1 op-90">
          <div class="flex gap-1">
            <div>运行中: {{ topInfo.tasks.running }}</div>
            <div>休眠中: {{ topInfo.tasks.sleeping }}</div>
          </div>
          <div class="flex gap-1">
            <div>停止中: {{ topInfo.tasks.stopped }}</div>
            <div>僵死进程: {{ topInfo.tasks.zombie }}</div>
          </div>
        </div>
      </div>
    </NCard>
    <NDataTable size="small" :loading="isLoading" :columns="columns" :data="topInfo.processes ?? []" :scroll-x="2000" />
  </div>
</template>
