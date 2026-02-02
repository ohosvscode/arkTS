<script setup lang="tsx">
import type { TableColumns } from 'naive-ui/es/data-table/src/interface'
import type { HdcManagerConnectionProtocol } from '../../interfaces/hdc-connection-protocol'

const { t } = useI18n()

const connection = useHdcConnection()
const { images } = await connection.requestRemoteImageList?.() ?? { images: [] }
const isValidLocalImagePath = ref(await connection.isValidLocalImagePath?.(await connection.getLocalImagePath?.() ?? ''))
const localImagePath = ref(await connection.getLocalImagePath?.())
const feedback = computed(() => {
  switch (isValidLocalImagePath.value) {
    case 'not-folder':
      return t('hdcManager.deviceManager.localImagePath.feedback.not-folder')
    case 'not-exists':
      return t('hdcManager.deviceManager.localImagePath.feedback.not-exists')
    case 'invalid-permission':
      return t('hdcManager.deviceManager.localImagePath.feedback.invalid-permission')
    default:
      return t('hdcManager.deviceManager.localImagePath.feedback')
  }
})
const canDownload = computed(() => isValidLocalImagePath.value === true)
onDidChangeLocalImagePath((path, isValid) => {
  localImagePath.value = path
  isValidLocalImagePath.value = isValid
})
const columns: TableColumns<HdcManagerConnectionProtocol.ServerFunction.RequestRemoteImageList.Image> = [
  {
    title: 'Device Name',
    key: 'title',
    render: row => (
      <div class="flex items-center gap-2">
        <div class={`${getIconByDeviceType(row.deviceType)} text-2xl`} />
        {`${row.systemName}(${row.targetVersion})`}
      </div>
    ),
    minWidth: 200,
  },
  {
    title: 'API Version',
    key: 'apiVersion',
    sorter: (a, b) => a.numericApiVersion - b.numericApiVersion,
    minWidth: 120,
  },
  {
    title: 'Device Type',
    key: 'deviceType',
    filterOptions: [
      { label: 'phone', value: 'phone' },
      { label: 'tablet', value: 'tablet' },
      { label: 'pc', value: 'pc' },
      { label: 'wearable', value: 'wearable' },
      { label: 'tv', value: 'tv' },
      { label: 'foldable', value: 'foldable' },
      { label: 'widefold', value: 'widefold' },
      { label: '2in1', value: '2in1' },
    ],
    filter: (value, row) => row.deviceType === value,
    minWidth: 130,
  },
  {
    key: 'action',
    render: (row) => {
      return (
        <NButton size="small" disabled={!canDownload.value} type="primary" onClick={() => downloadImage(row)}>
          {{ default: () => t('download'), icon: () => <div class="i-ph-download-duotone" /> }}
        </NButton>
      )
    },
  },
]

function downloadImage(row: HdcManagerConnectionProtocol.ServerFunction.RequestRemoteImageList.Image) {
  connection.requestRemoteImageDownload?.(row)
}

function getIconByDeviceType(deviceType: HdcManagerConnectionProtocol.ServerFunction.RequestRemoteImageList.Image.DeviceType) {
  switch (deviceType) {
    case 'phone':
      return 'i-ph-device-mobile-camera-duotone'
    case 'tablet':
      return 'i-ph-device-tablet-camera-duotone'
    case 'pc':
      return 'i-ph-devices-duotone'
    case 'wearable':
      return 'i-ph-watch-duotone'
    case 'tv':
      return 'i-ph-television-duotone'
    case 'foldable':
      return 'i-ph-device-tablet-duotone'
    case 'widefold':
      return 'i-ph-device-tablet-speaker-duotone'
    case '2in1':
      return 'i-ph-laptop-duotone'
    default:
      return 'i-ph-question-duotone'
  }
}
</script>

<template>
  <div>
    <Heading :title="$t('hdcManager.deviceManager')" />
    <NFormItem
      size="small"
      :label="$t('hdcManager.deviceManager.localImagePath')"
      label-placement="left"
      class="opacity-feedback"
      :feedback="feedback"
      :validation-status="canDownload ? undefined : 'error'"
    >
      <NInput v-model:value="localImagePath" readonly />
    </NFormItem>
    <NDataTable :scroll-x="300" striped mt-1 size="small" :columns :data="images" />
  </div>
</template>

<style scoped>
.opacity-feedback :deep(.n-form-item-feedback) {
  opacity: 0.7;
  font-size: 11.5px;
}
</style>
