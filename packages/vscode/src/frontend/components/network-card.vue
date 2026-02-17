<script setup lang="ts">
import type { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'
import type { ParsedIfconfig } from '../utils/parse-ifconfig'

const { deviceInfo, deviceInfoLoading } = defineProps<{
  deviceInfo?: HdcManagerConnectionProtocol.ServerFunction.GetDeviceInfo.Response
  deviceInfoLoading?: boolean
}>()

/** 有 IP 或为 UP 的接口优先，且过滤掉空名 */
const interfaces = computed(() => {
  const list = (deviceInfo?.network ?? []) as ParsedIfconfig[]
  return list
    .filter(i => i.name?.trim())
    .sort((a, b) => {
      const score = (i: ParsedIfconfig) => (i.inet ? 2 : 0) + (i.up ? 1 : 0)
      return score(b) - score(a)
    })
})

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`
  return `${bytes} B`
}
</script>

<template>
  <NSpin :show="deviceInfoLoading">
    <NCard size="small">
      <template #header>网络</template>
      <NEmpty v-if="interfaces.length === 0 && !deviceInfoLoading" text-secondary text-3.2>
        暂无网卡信息
      </NEmpty>
      <NList v-else hoverable size="small">
        <NListItem v-for="(iface, index) in interfaces" :key="index">
          <NThing>
            <template #header>
              <span font-medium>{{ iface.name }}</span>
            </template>
            <template #header-extra>
              <span v-if="iface.inet" text-2.8 ml-1>{{ iface.inet }}</span>
              <NTag v-if="iface.up" size="tiny" type="success" ml-1>UP</NTag>
              <NTag v-else size="tiny" type="default" ml-1>DOWN</NTag>
            </template>
            <template #description>
              <div v-if="iface.linkEncap" text-2.6 text-secondary>
                {{ iface.linkEncap }}
                <span v-if="iface.hwaddr"> · {{ iface.hwaddr }}</span>
              </div>
              <div flex="~ gap-3" text-2.6 text-secondary>
                <span>↓ {{ formatBytes(iface.rxBytes) }}</span>
                <span>↑ {{ formatBytes(iface.txBytes) }}</span>
                <span v-if="iface.mtu">MTU {{ iface.mtu }}</span>
              </div>
            </template>
          </NThing>
        </NListItem>
      </NList>
    </NCard>
  </NSpin>
</template>
