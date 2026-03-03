<script lang="ts" setup>
import type { HdcManagerConnectionProtocol } from '../../interfaces/hdc-connection-protocol'

const { connection } = useHdcConnection()
const devices = ref<HdcManagerConnectionProtocol.ServerFunction.GetConnectedDevices.Device[]>([])
const currentDevice = ref<string | undefined>(undefined)
const deviceInfo = ref<HdcManagerConnectionProtocol.ServerFunction.GetDeviceInfo.Response | undefined>(undefined)
const deviceInfoLoading = ref(false)
/** 设备列表清空前的 connectKey，用于恢复时优先选回同一设备，避免误触发 hilog 重启 */
let lastConnectKeyBeforeDisconnect: string | undefined

async function refreshDeviceInfo(spin: boolean = false) {
  try {
    if (spin) deviceInfoLoading.value = true
    if (!currentDevice.value) return
    deviceInfo.value = await connection.getDeviceInfo?.(currentDevice.value)
  }
  finally {
    if (spin) deviceInfoLoading.value = false
  }
}
const createDeviceInfo = useCallOnce(() => useIntervalFn(refreshDeviceInfo, 5000, { immediate: true }))

useIntervalFn(async () => {
  devices.value = (await connection.getConnectedDevices?.() ?? { devices: [] }).devices ?? []
  if (devices.value.length > 0 && !currentDevice.value) {
    const preferred = lastConnectKeyBeforeDisconnect
      ? devices.value.find(d => d.connectKey === lastConnectKeyBeforeDisconnect)
      : undefined
    currentDevice.value = (preferred ?? devices.value[0]).connectKey
    createDeviceInfo()
  }
  else if (devices.value.length === 0 && currentDevice.value) {
    lastConnectKeyBeforeDisconnect = currentDevice.value
    currentDevice.value = undefined
    deviceInfo.value = undefined
  }
}, 1000, { immediate: true, immediateCallback: true })

watch(currentDevice, () => connection.setCurrentConnectKey(currentDevice.value || -1))
</script>

<template>
  <NEmpty v-if="devices.length === 0" :description="$t('hdcManager.noDevices')" select-none h-screen flex="~ items-center justify-center">
    <template #icon>
      <div i-ph-plugs-connected-duotone />
    </template>
    <template #extra>
      <NButton type="primary" size="small" @click="connection.openConnectDeviceDialog?.()">
        连接设备
        <template #icon>
          <div i-ph-plug-duotone />
        </template>
      </NButton>
    </template>
  </NEmpty>
  <NTabs
    v-else
    v-model:value="currentDevice"
    type="card"
    placement="bottom"
    size="small"
    addable
    closable
    :theme-overrides="{ tabPaddingSmallCard: '6px 16px' }"
    @add="connection.openConnectDeviceDialog?.()"
    @close="connectKey => connection.disconnectDevice?.(connectKey)"
  >
    <NTabPane v-for="(device, index) in devices" :key="index" :name="device.connectKey">
      <Hilog :current-device="currentDevice" :device-info-loading="deviceInfoLoading" @open-hilog="connection.openHilog?.()" />
      <NSplit direction="horizontal" :default-size="0.70" :max="0.70" :min="0.60" pane1-class="pr-0.5" pane2-class="pl-0.5">
        <template #1>
          <div flex="~ col gap-2">
            <BasicDeviceInfo w-full :device-info="deviceInfo" :device="device" :device-info-loading="deviceInfoLoading" />
            <BatteryCard w-full :device-info="deviceInfo" :device-info-loading="deviceInfoLoading" />
          </div>
        </template>
        <template #2>
          <NetworkCard w-full :device-info="deviceInfo" :device-info-loading="deviceInfoLoading" />
        </template>
        <template #resize-trigger>
          <div h-full />
        </template>
      </NSplit>
    </NTabPane>
  </NTabs>
</template>

<style>
body {
  padding: 0px 10px;
  padding-bottom: 30px;
}
</style>

<style scoped>
.n-tabs :deep(.n-tabs-nav) {
  position: fixed;
  bottom: 0;
  width: 100%;
  left: 0;
  padding: 0 10px 0px 10px;
  padding-top: 0;
  z-index: 99;
  background: var(--vscode-editor-background);
}
</style>

<route lang="yaml">
meta:
  noGap: true
</route>
