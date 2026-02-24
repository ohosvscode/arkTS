<script setup lang="ts">
import type { Device, LocalImage, PascalCaseDeviceType, ProductConfigItem, ProductPreset } from '@arkts/image-manager'

const props = defineProps<{
  productConfig: ProductConfigItem[]
  deviceType: PascalCaseDeviceType
  localImage: LocalImage.Stringifiable
}>()

const deviceName = ref(props.productConfig?.[0]?.name.split('、')[0] || '')
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
  getScreen(): ProductPreset.Stringifiable
  getDeviceOptions(): Omit<Device.Options, 'screen'>
}

defineExpose<SingleDeviceCreatorExpose>({
  getScreen: () => ({
    product: props.productConfig.find(item => item.name === deviceName.value)!,
    deviceType: props.deviceType,
  }),
  getDeviceOptions: () => ({
    name: deviceName.value,
    cpuNumber: 4,
    diskSize: storageUnit.value === 'GB' ? storage.value * 1024 : storage.value,
    memorySize: memoryUnit.value === 'GB' ? memory.value * 1024 : memory.value,
  }),
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
        <div>版本: {{ localImage.targetOS }} {{ localImage.targetVersion }} (API{{ localImage.apiVersion }})</div>
      </div>
    </NFormItem>
    <NFormItem :label="$t('hdcManager.deviceManager.creator.storage.title')" required content-class="flex gap-2 items-center">
      <NInputNumber v-model:value="storage" :min="1" :max="128" @mouseenter="currentHovered = 'storage'" />
      <NSelect v-model:value="storageUnit" max-w-20 menu-size="small" :options="[{ label: 'GB', value: 'GB' }, { label: 'MB', value: 'MB' }]" @mouseenter="currentHovered = 'storage'" />
    </NFormItem>
  </DeviceCreator>
</template>
