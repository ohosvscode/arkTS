<script setup lang="ts">
import type { EmulatorFile } from '@arkts/image-manager'
import type { DeviceManagerProtocol } from '../interfaces/device-manager-protocol'
import type { SerializableCreateDeviceOptions } from '../pages/device-manager/create-device.vue'

const props = defineProps<{
  config: DeviceManagerProtocol.ServerFunction.GetConfigByLocalImage.Response | null
}>()

const deviceName = ref(props.config?.productConfig?.[0].content?.name.split('、')[0] || props.config?.emulatorConfig?.name || '')
const memory = ref(4)
const memoryUnit = ref<'GB' | 'MB'>('GB')
const storage = ref(6)
const storageUnit = ref<'GB' | 'MB'>('GB')

const { t } = useI18n()

type HoverType = 'deviceName' | 'memory' | 'storage'
const currentHovered = ref<HoverType>('deviceName')
const creatorTitle = computed(() => {
  switch (currentHovered.value) {
    case 'deviceName':
      return t('hdcManager.deviceManager.creator.deviceName.title')
    case 'memory':
      return t('hdcManager.deviceManager.creator.memory.title')
    case 'storage':
      return t('hdcManager.deviceManager.creator.storage.title')
    default:
      return ''
  }
})

const creatorDescription = computed(() => {
  switch (currentHovered.value) {
    case 'deviceName':
      return t('hdcManager.deviceManager.creator.deviceName.description')
    case 'memory':
      return t('hdcManager.deviceManager.creator.memory.description')
    case 'storage':
      return t('hdcManager.deviceManager.creator.storage.description')
    default:
      return ''
  }
})

export interface SingleDeviceCreatorExpose {
  getCreateDeviceOptions(): SerializableCreateDeviceOptions
}

defineExpose<SingleDeviceCreatorExpose>({
  getCreateDeviceOptions: () => {
    console.warn(props.config)
    return {
      name: deviceName.value,
      cpuNumber: 4,
      dataDiskSize: storageUnit.value === 'GB' ? storage.value * 1024 : storage.value,
      memoryRamSize: memoryUnit.value === 'GB' ? memory.value * 1024 : memory.value,
      screen: {
        productConfigItem: props.config?.productConfig[0],
        emulatorDeviceItem: props.config?.emulatorConfig as EmulatorFile.ItemContent,
      },
    } as any
  },
})
</script>

<template>
  <DeviceCreator :title="creatorTitle" :description="creatorDescription">
    <NFormItem :label="$t('hdcManager.deviceManager.creator.deviceName.title')" required>
      <NInput v-model:value="deviceName" @mouseenter="currentHovered = 'deviceName'" />
    </NFormItem>
    <NFormItem :label="$t('hdcManager.deviceManager.creator.memory.title')" required content-class="flex gap-2 items-center">
      <NInputNumber v-model:value="memory" :min="1" :max="16" @mouseenter="currentHovered = 'memory'" />
      <NSelect v-model:value="memoryUnit" max-w-20 menu-size="small" :options="[{ label: 'GB', value: 'GB' }, { label: 'MB', value: 'MB' }]" @mouseenter="currentHovered = 'memory'" />
    </NFormItem>
    <NFormItem label="信息">
      <div flex="~ col">
        <div>版本: {{ config?.localImage?.sdkPkgFile.data?.guestVersion }}</div>
        <div>API版本: {{ config?.localImage?.sdkPkgFile.data?.apiVersion }}</div>
      </div>
    </NFormItem>
    <NFormItem :label="$t('hdcManager.deviceManager.creator.storage.title')" required content-class="flex gap-2 items-center">
      <NInputNumber v-model:value="storage" :min="1" :max="128" @mouseenter="currentHovered = 'storage'" />
      <NSelect v-model:value="storageUnit" max-w-20 menu-size="small" :options="[{ label: 'GB', value: 'GB' }, { label: 'MB', value: 'MB' }]" @mouseenter="currentHovered = 'storage'" />
    </NFormItem>
  </DeviceCreator>
</template>
