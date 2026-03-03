<script setup lang="ts">
import type { CustomizeFoldableScreen, CustomizeScreen, EmulatorFile, Image, LocalImage, ProductConfigItem, ScreenPreset } from '@arkts/image-manager'

const { imagePath, deviceType } = useRoute().query as { imagePath: Image.RelativePath, deviceType: EmulatorFile.DeviceType }
const { connection } = useDeviceManagerConnection()
const router = useRouter()
const multiDeviceCreatorRef = useTemplateRef('multiDeviceCreatorRef')
const singleDeviceCreatorRef = useTemplateRef('singleDeviceCreatorRef')

const { data: config } = useAsyncData(() => connection.getConfigByLocalImage(imagePath, deviceType))

export type SerializableCreateDeviceOptions = Omit<LocalImage.CreateDeviceOptions, 'screen'> & {
  readonly screen: Omit<ScreenPreset.Options, 'productConfigItem' | 'emulatorDeviceItem'> & {
    readonly productConfigItem: ProductConfigItem.Serializable
    readonly emulatorDeviceItem: EmulatorFile.ItemContent
    readonly customizeScreen?: CustomizeScreen.Options
    readonly customizeFoldableScreen?: CustomizeFoldableScreen.Options
  }
}

const { loading, execute: deployLocalImage } = useLoadingFn(async () => {
  if (multiDeviceCreatorRef.value) {
    const createDeviceOptions = multiDeviceCreatorRef.value.getCreateDeviceOptions()
    deploy(createDeviceOptions)
  }
  else if (singleDeviceCreatorRef.value) {
    const createDeviceOptions = singleDeviceCreatorRef.value.getCreateDeviceOptions()
    deploy(createDeviceOptions)
    console.warn(createDeviceOptions)
  }
})

async function deploy(createDeviceOptions: SerializableCreateDeviceOptions) {
  const productConfigItem = config.value?.productConfig.find((item) => {
    return item.deviceType === createDeviceOptions.screen.productConfigItem.deviceType
      && item.content.name === createDeviceOptions.screen.productConfigItem.content.name
      && item.content.devModel === createDeviceOptions.screen.productConfigItem.content.devModel
  })
  const emulatorDeviceItem = (createDeviceOptions.screen.emulatorDeviceItem && config.value?.emulatorConfig)
    ? (createDeviceOptions.screen.emulatorDeviceItem.api === config.value?.emulatorConfig?.api && createDeviceOptions.screen.emulatorDeviceItem.name === config.value?.emulatorConfig?.name)
        ? config.value?.emulatorConfig
        : undefined
    : undefined
  const result = await connection.deployLocalImage?.(imagePath, {
    ...createDeviceOptions,
    screen: (productConfigItem && emulatorDeviceItem
      ? {
          productConfigItem,
          emulatorDeviceItem,
          customizeScreen: createDeviceOptions.screen.customizeScreen,
          customizeFoldableScreen: createDeviceOptions.screen.customizeFoldableScreen,
        }
      : undefined) as any,
  })
  if (!result) return
  router.replace('/device-manager')
}
</script>

<template>
  <div>
    <Heading back title="创建设备">
      <NButton type="primary" :loading :disabled="loading" @click="deployLocalImage">
        <template #icon>
          <div i-ph-plus-circle-duotone />
        </template>
        {{ $t('create') }}
      </NButton>
    </Heading>
    <template v-if="deviceType === 'phone'">
      <MultiDeviceCreator v-if="Number(config?.localImage?.apiVersion ?? 0) >= 20" ref="multiDeviceCreatorRef" :config="config" :device-type="deviceType" />
      <SingleDeviceCreator v-else ref="singleDeviceCreatorRef" :config />
    </template>
    <template v-else-if="deviceType === 'foldable'">
      <MultiDeviceCreator v-if="Number(config?.localImage?.apiVersion ?? 0) >= 21" ref="multiDeviceCreatorRef" :config :device-type="deviceType" />
      <SingleDeviceCreator v-else ref="singleDeviceCreatorRef" :config />
    </template>
    <template v-else-if="deviceType === 'widefold'">
      <SingleDeviceCreator ref="singleDeviceCreatorRef" :config />
    </template>
    <template v-else-if="deviceType === 'triplefold'">
      <SingleDeviceCreator ref="singleDeviceCreatorRef" :config />
    </template>
    <template v-else-if="deviceType === 'tablet'">
      <MultiDeviceCreator v-if="Number(config?.localImage?.apiVersion ?? 0) >= 21" ref="multiDeviceCreatorRef" :config :device-type="deviceType" />
      <SingleDeviceCreator v-else ref="singleDeviceCreatorRef" :config />
    </template>
    <template v-else-if="deviceType === '2in1'">
      <MultiDeviceCreator v-if="Number(config?.localImage?.apiVersion ?? 0) >= 21" ref="multiDeviceCreatorRef" :config :device-type="deviceType" />
      <SingleDeviceCreator v-else ref="singleDeviceCreatorRef" :config />
    </template>
    <template v-else-if="deviceType === '2in1_foldable'">
      <SingleDeviceCreator ref="singleDeviceCreatorRef" :config :device-type="deviceType" />
    </template>
    <template v-else-if="deviceType === 'wearable'">
      <SingleDeviceCreator ref="singleDeviceCreatorRef" :config :device-type="deviceType" />
    </template>
    <template v-else-if="deviceType === 'tv'">
      <SingleDeviceCreator ref="singleDeviceCreatorRef" :config />
    </template>
  </div>
</template>
