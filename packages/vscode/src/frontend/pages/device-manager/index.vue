<script setup lang="ts">
import type { FullDeployedImageOptions } from '@arkts/image-manager'
import { getIconByDeviceType } from '../../composables/device-type-icon'

const { connection } = useDeviceManagerConnection()
const deployedEmulatorPath = computed(() => '/Users/naily/.huawei/Emulator/deployed')

const { data: version = 'unknown' } = useAsyncData(() => connection.getImageManagerVersion?.())
const { data: isCompatible = true } = useAsyncData(() => connection.isCompatible?.())
const { data: devices, execute: getLocalDevices, loading: getLocalDevicesLoading } = useAsyncData(() => connection.getLocalDevices?.())

function deleteDevice(device: FullDeployedImageOptions) {
  connection.deleteDevice?.(device.name, device.imageDir).finally(() => getLocalDevices())
}
</script>

<template>
  <div>
    <Heading :title="$t('hdcManager.deviceManager.title')">
      <NButton type="info" @click="$router.push('/device-manager/image-manager')">
        <template #icon><div i-ph-disc-duotone /></template>
        {{ $t('hdcManager.imageManager.title') }}
      </NButton>
      <NButton type="primary" @click="getLocalDevices">
        {{ $t('refresh') }}
        <template #icon><div i-ph-arrow-clockwise-duotone /></template>
      </NButton>
    </Heading>
    <NFormItem
      size="small"
      :label="$t('hdcManager.deviceManager.deployedEmulatorPath.title')"
      label-placement="left"
      class="opacity-feedback mb-1"
      :feedback="$t('hdcManager.deviceManager.deployedEmulatorPath.feedback')"
    >
      <NInput v-model:value="deployedEmulatorPath" readonly mr-2 />
      <a href="command:workbench.action.openSettings?%7B%22query%22%3A%22ets.deployedEmulatorPath%22%7D">
        <NButton text type="info">编辑</NButton>
      </a>
    </NFormItem>
    <div v-if="!isCompatible" mb-2>
      <NAlert :title="$t('hdcManager.deviceManager.compatibilityWarning.title')" type="error">
        {{ $t('hdcManager.deviceManager.compatibilityWarning.description', [version]) }}
      </NAlert>
    </div>
    <NSpin :show="getLocalDevicesLoading">
      <NList hoverable>
        <NListItem v-for="(device, index) in devices?.devices ?? []" :key="index">
          <NThing :title="device.name">
            <template #avatar>
              <div :class="`${getIconByDeviceType(device.type)} text-2xl`" />
            </template>
            <template #description>
              <div class="flex items-center gap-2 flex-wrap mt-3">
                <NTag size="small" type="info">DeviceType: {{ device.type }}</NTag>
                <NTag size="small" type="info">UUID: {{ device.uuid }}</NTag>
                <NTag size="small" type="info">CPU: {{ device.cpuNumber }}核心</NTag>
                <NTag size="small" type="info">RAM: {{ device.memoryRamSize }}MB</NTag>
                <NTag size="small" type="info">像素密度: {{ device.density }}PPI</NTag>
                <NTag size="small" type="info">分辨率: {{ device.resolutionHeight }}x{{ device.resolutionWidth }}</NTag>
                <NTag size="small" type="info">屏幕大小: {{ device.diagonalSize }}英寸</NTag>
                <NTag size="small" type="info">版本: {{ device.showVersion }}</NTag>
                <NTag size="small" type="info">CPU/ABI: {{ device.abi }}</NTag>
              </div>
            </template>
            <template #header-extra>
              <div flex="~ gap-2">
                <NButton type="primary" size="small" @click="connection.startDevice(device)">
                  启动
                  <template #icon><div i-ph-play-duotone /></template>
                </NButton>
                <NButton type="error" size="small" @click="deleteDevice(device)">
                  删除
                  <template #icon><div i-ph-trash-duotone /></template>
                </NButton>
              </div>
            </template>
          </NThing>
        </NListItem>
      </NList>
    </NSpin>
    <div op-50 mt-2 text-2.5>@arkts/image-manager version: {{ version }}</div>
  </div>
</template>

<style scoped>
.opacity-feedback :deep(.n-form-item-feedback) {
  opacity: 0.7;
  font-size: 11.5px;
}
</style>
