<script setup lang="ts">
import type { Device, LocalImage, PascalCaseDeviceType, ProductConfigItem, ProductPreset, Screen, SnakecaseDeviceType } from '@arkts/image-manager'

const props = defineProps<{
  productConfig: ProductConfigItem[]
  deviceType: PascalCaseDeviceType
  localImage: LocalImage.Stringifiable
  snakecaseDeviceType: SnakecaseDeviceType
}>()

export interface MultiDeviceCreatorExpose {
  getDeviceOptions(): Omit<Device.Options, 'screen'>
  getScreen(): Screen.Stringifiable | ProductPreset.Stringifiable
  getDeviceName(): string
  getImagePath(): string
}

const screenConfig = ref(props.productConfig?.[0]?.name || '')
const screenConfigs = computed(() => props.productConfig?.map(item => ({ label: item.name, value: item.name })) || [])
const isCustomizedScreen = computed(() => screenConfig.value === 'Customize')
const deviceName = ref(props.productConfig?.[0]?.name.split('、')[0] || '')
const screenDiagonal = ref(Number(props.productConfig?.[0].screenDiagonal || 3.5))
const screenWidth = ref(Number(props.productConfig?.[0].screenWidth || 1320))
const screenHeight = ref(Number(props.productConfig?.[0].screenHeight || 2848))
const screenDensity = ref(Number(props.productConfig?.[0].screenDensity || 240))
const memory = ref(4)
const memoryUnit = ref<'GB' | 'MB'>('GB')
const storage = ref(6)
const storageUnit = ref<'GB' | 'MB'>('GB')
watch(screenConfig, () => {
  const screenConfigItem = props.productConfig?.find(item => item.name === screenConfig.value)
  if (!screenConfigItem) return
  deviceName.value = screenConfigItem.name.split('、')[0]
  screenDiagonal.value = Number(screenConfigItem.screenDiagonal)
  screenWidth.value = Number(screenConfigItem.screenWidth)
  screenHeight.value = Number(screenConfigItem.screenHeight)
  screenDensity.value = Number(screenConfigItem.screenDensity)
})

const { t } = useI18n()

type HoverType = 'deviceName' | 'screenConfig' | 'screenDiagonal' | 'screenWidth' | 'screenHeight' | 'screenDensity' | 'memory' | 'storage'
const currentHovered = ref<HoverType>('deviceName')
const creatorTitle = computed(() => {
  switch (currentHovered.value) {
    case 'deviceName':
      return t('hdcManager.deviceManager.creator.deviceName.title')
    case 'screenConfig':
      return t('hdcManager.deviceManager.creator.screenConfig.title')
    case 'screenDiagonal':
      return t('hdcManager.deviceManager.creator.screenDiagonal.title')
    case 'screenWidth':
      return t('hdcManager.deviceManager.creator.screenWidth.title')
    case 'screenHeight':
      return t('hdcManager.deviceManager.creator.screenHeight.title')
    case 'screenDensity':
      return t('hdcManager.deviceManager.creator.screenDensity.title')
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
    case 'screenConfig':
      return t('hdcManager.deviceManager.creator.screenConfig.description')
    case 'screenDiagonal':
      return t('hdcManager.deviceManager.creator.screenDiagonal.description', [3.5, 9])
    case 'screenWidth':
      return t('hdcManager.deviceManager.creator.screenWidth.description', [720, 3500])
    case 'screenHeight':
      return t('hdcManager.deviceManager.creator.screenHeight.description', [720, 3500])
    case 'screenDensity':
      return t('hdcManager.deviceManager.creator.screenDensity.description', [240, 640])
    case 'memory':
      return t('hdcManager.deviceManager.creator.memory.description')
    case 'storage':
      return t('hdcManager.deviceManager.creator.storage.description')
    default:
      return ''
  }
})

defineExpose<MultiDeviceCreatorExpose>({
  getDeviceOptions: () => ({
    name: deviceName.value,
    cpuNumber: 4,
    diskSize: storageUnit.value === 'GB' ? storage.value * 1024 : storage.value,
    memorySize: memoryUnit.value === 'GB' ? memory.value * 1024 : memory.value,
  }),
  getScreen: () => isCustomizedScreen.value
    ? {
        density: screenDensity.value,
        diagonal: screenDiagonal.value,
        width: screenWidth.value,
        height: screenHeight.value,
        apiVersion: Number(props.localImage?.apiVersion ?? ''),
        deviceType: props.snakecaseDeviceType,
      }
    : {
        product: props.productConfig.find(item => item.name === screenConfig.value)!,
        deviceType: props.deviceType,
      },
  getDeviceName: () => deviceName.value,
  getImagePath: () => props.localImage?.path || '',
})
</script>

<template>
  <DeviceCreator :title="creatorTitle" :description="creatorDescription">
    <NFormItem :label="$t('hdcManager.deviceManager.creator.deviceName.title')" required>
      <NInput v-model:value="deviceName" @mouseenter="currentHovered = 'deviceName'" />
    </NFormItem>
    <NFormItem :label="$t('hdcManager.deviceManager.creator.screenConfig.title')" required>
      <NSelect v-model:value="screenConfig" menu-size="small" :options="screenConfigs" @mouseenter="currentHovered = 'screenConfig'" />
    </NFormItem>
    <NFormItem :label="$t('hdcManager.deviceManager.creator.screenDiagonal.title')" required>
      <NInputNumber v-model:value="screenDiagonal" :disabled="!isCustomizedScreen" :min="3.5" :max="9" @mouseenter="currentHovered = 'screenDiagonal'" />
      <span ml-2>inch</span>
    </NFormItem>
    <NFormItem :label="$t('hdcManager.deviceManager.creator.screenWidth.title')" required>
      <NInputNumber v-model:value="screenWidth" :disabled="!isCustomizedScreen" :min="720" :max="3500" @mouseenter="currentHovered = 'screenWidth'" />
      <span mx-2>x</span>
      <NInputNumber v-model:value="screenHeight" :disabled="!isCustomizedScreen" :min="720" :max="3500" @mouseenter="currentHovered = 'screenHeight'" />
      <span ml-2>px</span>
    </NFormItem>
    <NFormItem :label="$t('hdcManager.deviceManager.creator.screenDensity.title')" required>
      <NInputNumber v-model:value="screenDensity" :disabled="!isCustomizedScreen" :min="240" :max="640" @mouseenter="currentHovered = 'screenDensity'" />
    </NFormItem>
    <NFormItem :label="$t('hdcManager.deviceManager.creator.memory.title')" required content-class="flex gap-2 items-center">
      <NInputNumber v-model:value="memory" :min="1" :max="16" @mouseenter="currentHovered = 'memory'" />
      <NSelect v-model:value="memoryUnit" max-w-20 menu-size="small" :options="[{ label: 'GB', value: 'GB' }, { label: 'MB', value: 'MB' }]" @mouseenter="currentHovered = 'memory'" />
    </NFormItem>
    <NFormItem :label="$t('hdcManager.deviceManager.creator.storage.title')" required content-class="flex gap-2 items-center">
      <NInputNumber v-model:value="storage" :min="1" :max="128" @mouseenter="currentHovered = 'storage'" />
      <NSelect v-model:value="storageUnit" max-w-20 menu-size="small" :options="[{ label: 'GB', value: 'GB' }, { label: 'MB', value: 'MB' }]" @mouseenter="currentHovered = 'storage'" />
    </NFormItem>
  </DeviceCreator>
</template>
