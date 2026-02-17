<script setup lang="ts">
import type { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'

const { deviceInfo, device, deviceInfoLoading } = defineProps<{
  deviceInfo?: HdcManagerConnectionProtocol.ServerFunction.GetDeviceInfo.Response
  device?: HdcManagerConnectionProtocol.ServerFunction.GetConnectedDevices.Device
  deviceInfoLoading: boolean
}>()
</script>

<template>
  <NSpin :show="deviceInfoLoading">
    <NCard size="small">
      <template #header>
        <div flex="~ gap-1 items-baseline">
          <div>{{ deviceInfo?.model ?? device?.connectKey }}</div>
          <div v-if="deviceInfo?.cpuAbilist" class="op-70 text-2.5">
            {{ deviceInfo?.cpuAbilist }}
          </div>
        </div>
      </template>
      <template #header-extra>
        <div flex="~ gap-1 items-baseline">
          <div>{{ deviceInfo?.productName ?? '' }}</div>
        </div>
      </template>
      <div flex="~ gap-2" w-full class="flex-col md:flex-row">
        <div flex="~ col gap-1" w-full>
          <NProgress rail-color="var(--vscode-button-secondaryHoverBackground)" color="var(--vscode-button-background)" processing :percentage="deviceInfo?.cpuUsage ?? 0">
            CPU {{ deviceInfo?.cpuUsage }}%
          </NProgress>
          <NProgress rail-color="var(--vscode-button-secondaryHoverBackground)" color="var(--vscode-button-background)" processing :percentage="deviceInfo?.memoryUsage ?? 0">
            MEM {{ deviceInfo?.memoryUsage }}%
          </NProgress>
        </div>
        <div flex="~ col gap-1" w-full>
          <NProgress rail-color="var(--vscode-button-secondaryHoverBackground)" color="var(--vscode-button-background)" processing :percentage="deviceInfo?.storageUsage ?? 0">
            STO {{ deviceInfo?.storageUsage }}%
          </NProgress>
        </div>
      </div>
      <template #footer>
        <div flex="~ justify-between">
          <div flex="~ gap-1 items-baseline wrap">
            <div v-if="deviceInfo?.brand" class="op-70 text-2.5">{{ deviceInfo?.brand ?? '' }}</div>
            <div v-if="deviceInfo?.osDistName || deviceInfo?.incrementalVersion" class="op-70 text-2.5">{{ deviceInfo?.osDistName ?? '' }}{{ deviceInfo?.incrementalVersion ?? '' }}</div>
            <div v-if="deviceInfo?.apiVersion" class="op-70 text-2.5">API{{ deviceInfo?.apiVersion }}</div>
            <div v-if="deviceInfo?.fullName" class="op-70 text-2.5">{{ deviceInfo?.fullName ?? '' }}</div>
          </div>
        </div>
      </template>
    </NCard>
  </NSpin>
</template>
