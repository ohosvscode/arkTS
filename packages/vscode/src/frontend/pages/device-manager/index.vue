<script setup lang="ts">
import type { FullDeployedImageOptions } from '@arkts/image-manager'
import { getIconByDeviceType } from '../../composables/device-type-icon'

const connection = useHdcConnection()
const deployedEmulatorPath = computed(() => {
  return '/Users/naily/.huawei/Emulator/deployed'
})
const devices = ref<FullDeployedImageOptions[]>([])
await connection.getLocalDevices?.().then(res => devices.value = res.devices)
</script>

<template>
  <div>
    <Heading :title="$t('hdcManager.deviceManager.title')">
      <NButton type="primary" @click="$router.push('/device-manager/image-manager')">
        <template #icon><div i-ph-disc-duotone /></template>
        {{ $t('hdcManager.imageManager.title') }}
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
    <NList hoverable clickable>
      <NListItem v-for="(device, index) in devices" :key="index">
        <NThing :title="device.name">
          <template #avatar>
            <div :class="`${getIconByDeviceType(device.type)} text-2xl`" />
          </template>
          <template #description>
            <div class="flex items-center gap-2 flex-wrap">
              <NTag size="small" type="info">DeviceType: {{ device.type }}</NTag>
              <NTag size="small" type="info">UUID: {{ device.uuid }}</NTag>
              <NTag size="small" type="info">CPU: {{ device.cpuNumber }}核心</NTag>
              <NTag size="small" type="info">RAM: {{ device.memoryRamSize }}MB</NTag>
              <NTag size="small" type="info">像素密度: {{ device.density }}PPI</NTag>
              <NTag size="small" type="info">分辨率高度: {{ device.resolutionHeight }}</NTag>
              <NTag size="small" type="info">分辨率宽度: {{ device.resolutionWidth }}</NTag>
              <NTag size="small" type="info">屏幕大小: {{ device.diagonalSize }}英寸</NTag>
              <NTag size="small" type="info">版本: {{ device.showVersion }}</NTag>
              <NTag size="small" type="info">CPU/ABI: {{ device.abi }}</NTag>
            </div>
          </template>
          <template #header-extra>
            <NButton type="primary" size="small" @click="connection.startDevice(device)">
              启动
              <template #icon><div i-ph-play-duotone /></template>
            </NButton>
          </template>
        </NThing>
      </NListItem>
    </NList>
  </div>
</template>

<style scoped>
.opacity-feedback :deep(.n-form-item-feedback) {
  opacity: 0.7;
  font-size: 11.5px;
}
</style>
