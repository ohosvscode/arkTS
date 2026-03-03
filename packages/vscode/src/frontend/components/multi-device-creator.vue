<script setup lang="ts">
import type { EmulatorFile, ProductConfigItem } from '@arkts/image-manager'
import type { DeviceManagerProtocol } from '../interfaces/device-manager-protocol'
import type { SerializableCreateDeviceOptions } from '../pages/device-manager/create-device.vue'

const props = defineProps<{
  config: DeviceManagerProtocol.ServerFunction.GetConfigByLocalImage.Response | null
  deviceType: EmulatorFile.DeviceType
}>()

export interface MultiDeviceCreatorExpose {
  getCreateDeviceOptions(): SerializableCreateDeviceOptions
}

const screenConfig = ref(props.config?.productConfig?.[0].content?.name || '')
const screenConfigs = computed(() => props.config?.productConfig?.map(item => ({ label: item.content.name, value: item.content.name })) || [])
const isCustomizedScreen = computed(() => screenConfig.value === 'Customize')
const deviceName = ref(props.config?.productConfig?.[0].content?.name.split('、')[0] || '')
const screenDiagonal = ref(Number(props.config?.productConfig?.[0].content?.screenDiagonal || 3.5))
const screenWidth = ref(Number(props.config?.productConfig?.[0].content?.screenWidth || 1320))
const screenHeight = ref(Number(props.config?.productConfig?.[0].content?.screenHeight || 2848))
const screenDensity = ref(Number(props.config?.productConfig?.[0].content?.screenDensity || 240))
const memory = ref(4)
const memoryUnit = ref<'GB' | 'MB'>('GB')
const storage = ref(6)
const storageUnit = ref<'GB' | 'MB'>('GB')
watch(screenConfig, () => {
  const screenConfigItem = props.config?.productConfig?.find(item => item.content.name === screenConfig.value)
  if (!screenConfigItem) return
  deviceName.value = screenConfigItem.content.name.split('、')[0]
  screenDiagonal.value = Number(screenConfigItem.content.screenDiagonal)
  screenWidth.value = Number(screenConfigItem.content.screenWidth)
  screenHeight.value = Number(screenConfigItem.content.screenHeight)
  screenDensity.value = Number(screenConfigItem.content.screenDensity)
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
  getCreateDeviceOptions: () => ({
    name: deviceName.value,
    cpuNumber: 4,
    dataDiskSize: storageUnit.value === 'GB' ? storage.value * 1024 : storage.value,
    memoryRamSize: memoryUnit.value === 'GB' ? memory.value * 1024 : memory.value,
    screen: {
      productConfigItem: props.config?.productConfig.find(item => item.content.name === screenConfig.value) as ProductConfigItem.Serializable,
      emulatorDeviceItem: props.config?.emulatorConfig as EmulatorFile.ItemContent,
      customizeScreen: isCustomizedScreen.value
        ? {
            configName: screenConfig.value,
            diagonalSize: screenDiagonal.value,
            resolutionWidth: screenWidth.value,
            resolutionHeight: screenHeight.value,
            density: screenDensity.value,
          }
        : undefined,
      // TODO: 折叠屏自定义屏幕
      customizeFoldableScreen: isCustomizedScreen.value && props.deviceType === 'foldable'
        ? {
            coverResolutionWidth: screenWidth.value,
            coverResolutionHeight: screenHeight.value,
            coverDiagonalSize: screenDiagonal.value,
          }
        : undefined,
    },
  }),
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
