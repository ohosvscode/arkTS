<script setup lang="ts">
const { imagePath } = useRoute().query as { imagePath: string }
const { connection } = useDeviceManagerConnection()
const router = useRouter()
const multiDeviceCreatorRef = useTemplateRef('multiDeviceCreatorRef')
const singleDeviceCreatorRef = useTemplateRef('singleDeviceCreatorRef')

const { data: localImageProductConfig } = useAsyncData(() => connection.getLocalImageProductConfig?.(imagePath))
const { data: localImage } = useAsyncData(() => connection.getLocalImageByPath?.(imagePath))

const { loading, execute: deployLocalImage } = useLoadingFn(async () => {
  if (multiDeviceCreatorRef.value) {
    const deviceOptions = multiDeviceCreatorRef.value.getDeviceOptions()
    const screen = multiDeviceCreatorRef.value.getScreen()
    const deviceName = multiDeviceCreatorRef.value.getDeviceName()
    const imagePath = multiDeviceCreatorRef.value.getImagePath()
    if (!deviceOptions || !screen || !deviceName || !imagePath) return
    const result = await connection.deployLocalImage?.(deviceOptions, screen, imagePath)
    if (!result) return
    router.replace('/device-manager')
  }
  else if (singleDeviceCreatorRef.value) {
    // TODO
    const deviceOptions = singleDeviceCreatorRef.value.getDeviceOptions()
    const screen = singleDeviceCreatorRef.value.getScreen()
    const result = await connection.deployLocalImage?.(deviceOptions, screen, imagePath)
    if (!result) return
    router.replace('/device-manager')
  }
})
</script>

<template>
  <div>
    <Heading back title="创建设备">
      <NButton type="primary" :loading :disabled="loading" @click="deployLocalImage">
        <template #icon><div i-ph-plus-circle-duotone /></template>
        {{ $t('create') }}
      </NButton>
    </Heading>
    <template v-if="localImage?.snakecaseDeviceType === 'phone'">
      <MultiDeviceCreator
        v-if="Number(localImage?.apiVersion) >= 20"
        ref="multiDeviceCreatorRef"
        :product-config="localImageProductConfig?.productConfig ?? []"
        :local-image="localImage"
        :device-type="localImageProductConfig?.deviceType ?? 'Phone'"
        :snakecase-device-type="localImageProductConfig?.snakecaseDeviceType ?? 'phone'"
      />
      <SingleDeviceCreator
        v-else
        ref="singleDeviceCreatorRef"
        :product-config="localImageProductConfig?.productConfig ?? []"
        :local-image="localImage"
        :device-type="localImageProductConfig?.deviceType ?? 'Phone'"
      />
    </template>
    <template v-else-if="localImage?.snakecaseDeviceType === 'foldable'">
      <MultiDeviceCreator
        v-if="Number(localImage?.apiVersion) >= 21"
        ref="multiDeviceCreatorRef"
        :product-config="localImageProductConfig?.productConfig ?? []"
        :local-image="localImage"
        :device-type="localImageProductConfig?.deviceType ?? 'Phone'"
        :snakecase-device-type="localImageProductConfig?.snakecaseDeviceType ?? 'foldable'"
      />
      <SingleDeviceCreator
        v-else
        ref="singleDeviceCreatorRef"
        :product-config="localImageProductConfig?.productConfig ?? []"
        :local-image="localImage"
        :device-type="localImageProductConfig?.deviceType ?? 'Foldable'"
      />
    </template>
    <template v-else-if="localImage?.snakecaseDeviceType === 'widefold'">
      <SingleDeviceCreator
        ref="singleDeviceCreatorRef"
        :product-config="localImageProductConfig?.productConfig ?? []"
        :local-image="localImage"
        :device-type="localImageProductConfig?.deviceType ?? 'WideFold'"
      />
    </template>
    <template v-else-if="localImage?.snakecaseDeviceType === 'triplefold'">
      <SingleDeviceCreator
        ref="singleDeviceCreatorRef"
        :product-config="localImageProductConfig?.productConfig ?? []"
        :local-image="localImage"
        :device-type="localImageProductConfig?.deviceType ?? 'TripleFold'"
      />
    </template>
    <template v-else-if="localImage?.snakecaseDeviceType === 'tablet'">
      <MultiDeviceCreator
        v-if="Number(localImage?.apiVersion) >= 21"
        ref="multiDeviceCreatorRef"
        :product-config="localImageProductConfig?.productConfig ?? []"
        :local-image="localImage"
        :device-type="localImageProductConfig?.deviceType ?? 'Tablet'"
        :snakecase-device-type="localImageProductConfig?.snakecaseDeviceType ?? 'tablet'"
      />
      <SingleDeviceCreator
        v-else
        ref="singleDeviceCreatorRef"
        :product-config="localImageProductConfig?.productConfig ?? []"
        :local-image="localImage"
        :device-type="localImageProductConfig?.deviceType ?? 'Tablet'"
      />
    </template>
    <template v-else-if="localImage?.snakecaseDeviceType === '2in1'">
      <MultiDeviceCreator
        v-if="Number(localImage?.apiVersion) >= 21"
        ref="multiDeviceCreatorRef"
        :product-config="localImageProductConfig?.productConfig ?? []"
        :local-image="localImage"
        :device-type="localImageProductConfig?.deviceType ?? '2in1'"
        :snakecase-device-type="localImageProductConfig?.snakecaseDeviceType ?? '2in1'"
      />
      <SingleDeviceCreator
        v-else
        ref="singleDeviceCreatorRef"
        :product-config="localImageProductConfig?.productConfig ?? []"
        :local-image="localImage"
        :device-type="localImageProductConfig?.deviceType ?? '2in1'"
      />
    </template>
    <template v-else-if="localImage?.snakecaseDeviceType === '2in1_foldable'">
      <SingleDeviceCreator
        ref="singleDeviceCreatorRef"
        :product-config="localImageProductConfig?.productConfig ?? []"
        :local-image="localImage"
        :device-type="localImageProductConfig?.deviceType ?? '2in1 Foldable'"
      />
    </template>
    <template v-else-if="localImage?.snakecaseDeviceType === 'wearable'">
      <SingleDeviceCreator
        ref="singleDeviceCreatorRef"
        :product-config="localImageProductConfig?.productConfig ?? []"
        :local-image="localImage"
        :device-type="localImageProductConfig?.deviceType ?? 'Wearable'"
      />
    </template>
    <template v-else-if="localImage?.snakecaseDeviceType === 'tv'">
      <SingleDeviceCreator
        ref="singleDeviceCreatorRef"
        :product-config="localImageProductConfig?.productConfig ?? []"
        :local-image="localImage"
        :device-type="localImageProductConfig?.deviceType ?? 'TV'"
      />
    </template>
  </div>
</template>
