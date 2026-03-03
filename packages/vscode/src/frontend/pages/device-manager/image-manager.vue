<script setup lang="tsx">
import type { Image, RemoteImage } from '@arkts/image-manager'
import type { TableColumns } from 'naive-ui/es/data-table/src/interface'
import type { DeviceManagerProtocol } from '../../interfaces/device-manager-protocol'

const { t } = useI18n()
const router = useRouter()
const { connection, onDidChangeLocalImagePath, onDidRefresh } = useDeviceManagerConnection()

const { data: isValidLocalImagePath } = useAsyncData(async () => {
  const localImagePath = await connection.getLocalImagePath?.() ?? ''
  return connection.isValidLocalImagePath?.(localImagePath)
})
const { data: localImagePath } = useAsyncData(() => connection.getLocalImagePath?.())
const feedback = computed(() => {
  switch (isValidLocalImagePath.value) {
    case 'not-folder':
      return t('hdcManager.deviceManager.localImagePath.not-folder')
    case 'not-exists':
      return t('hdcManager.deviceManager.localImagePath.not-exists')
    case 'invalid-permission':
      return t('hdcManager.deviceManager.localImagePath.invalid-permission')
    default:
      return t('hdcManager.deviceManager.localImagePath.feedback')
  }
})
const canDownload = computed(() => isValidLocalImagePath.value === true)
const columns: TableColumns<DeviceManagerProtocol.ServerFunction.GetEmulatorConfig.Response> = [
  {
    title: 'Device Name',
    key: 'title',
    render: row => (
      <div class="flex items-center gap-2">
        <div class={`${getIconByDeviceType(row.content.deviceType)} text-2xl`} />
        {`${row.content.name} API${row.content.api}`}
      </div>
    ),
    minWidth: 200,
  },
  {
    title: 'API Version',
    key: 'apiVersion',
    sorter: (a, b) => a.content.api - b.content.api,
    defaultSortOrder: 'descend',
    minWidth: 120,
    render: row => `API${row.content.api}`,
  },
  {
    title: 'Device Type',
    key: 'content.deviceType',
    filterOptions: [
      { label: '2in1', value: '2in1' },
      { label: 'tablet', value: 'tablet' },
      { label: 'tv', value: 'tv' },
      { label: 'wearable', value: 'wearable' },
      { label: 'phone', value: 'phone' },
      { label: 'foldable', value: 'foldable' },
      { label: '2in1 Foldable', value: '2in1_foldable' },
      { label: 'TripleFold', value: 'triplefold' },
      { label: 'widefold', value: 'widefold' },
    ],
    filter: (value, row) => row.content.deviceType === value,
    minWidth: 130,
  },
  {
    key: 'action',
    filterOptions: [
      { label: '未下载', value: 'remote' },
      { label: '已下载', value: 'local' },
    ],
    filter: (value, row) => row.remoteImage?.imageType === value,
    render: row => row.localImage
      ? (
          <div class="flex items-center gap-3">
            <NButton
              size="small"
              type="info"
              disabled={!canDownload.value}
              onClick={() => router.push({
                path: '/device-manager/create-device',
                query: { imagePath: row.remoteImage.relativePath, deviceType: row.content.deviceType },
              })}
            >
              {{ default: () => t('create'), icon: () => <div class="i-ph-plus" /> }}
            </NButton>
            <NButton size="small" type="error" disabled={!canDownload.value} onClick={() => deleteLocalImage(row.remoteImage.relativePath)}>
              {{ default: () => t('delete'), icon: () => <div class="i-ph-trash-duotone" /> }}
            </NButton>
          </div>
        )
      : (
          <NButton size="small" disabled={!canDownload.value} type="primary" onClick={() => downloadImage(row.remoteImage)}>
            {{ default: () => t('download'), icon: () => <div class="i-ph-download-duotone" /> }}
          </NButton>
        ),
  },
]

const { data: images, loading, execute: requestRemoteImageList } = useAsyncData(async () => {
  return await connection.getEmulatorConfig?.()
})
onDidRefresh(() => requestRemoteImageList())

onDidChangeLocalImagePath((path, isValid) => {
  console.warn(`path: ${path}, isValid: ${isValid}`)
  localImagePath.value = path
  isValidLocalImagePath.value = isValid
  requestRemoteImageList()
})

function downloadImage(serializedImage: RemoteImage.Serializable) {
  connection.requestRemoteImageDownload?.(serializedImage)
}

function deleteLocalImage(imagePath: Image.RelativePath) {
  connection.deleteLocalImage?.(imagePath)
}
</script>

<template>
  <div>
    <Heading back :title="$t('hdcManager.imageManager.title')">
      <NButton type="primary" @click="requestRemoteImageList">
        {{ $t('refresh') }}
        <template #icon>
          <div class="i-ph-arrow-clockwise-duotone" />
        </template>
      </NButton>
    </Heading>
    <NFormItem
      size="small"
      :label="$t('hdcManager.deviceManager.localImagePath.title')"
      label-placement="left"
      class="opacity-feedback"
      :feedback="feedback"
      :validation-status="canDownload ? undefined : 'error'"
    >
      <NInput v-model:value="localImagePath" readonly mr-2 />
      <a href="command:workbench.action.openSettings?%7B%22query%22%3A%22ets.localImagePath%22%7D">
        <NButton text type="info">编辑</NButton>
      </a>
    </NFormItem>
    <NDataTable :scroll-x="300" striped mt-1 size="small" :columns :data="images ?? []" :loading="loading" />
  </div>
</template>

<style scoped>
.opacity-feedback :deep(.n-form-item-feedback) {
  opacity: 0.7;
  font-size: 11.5px;
}
</style>
