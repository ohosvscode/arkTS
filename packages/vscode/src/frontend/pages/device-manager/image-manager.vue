<script setup lang="tsx">
import type { DeviceType, LocalImage, RemoteImage } from '@arkts/image-manager'
import type { TableColumns } from 'naive-ui/es/data-table/src/interface'

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
onDidChangeLocalImagePath((path, isValid) => {
  console.warn(`path: ${path}, isValid: ${isValid}`)
  localImagePath.value = path
  isValidLocalImagePath.value = isValid
})

const columns: TableColumns<RemoteImage.Stringifiable | LocalImage.Stringifiable> = [
  {
    title: 'Device Name',
    key: 'title',
    render: row => (
      <div class="flex items-center gap-2">
        <div class={`${getIconByDeviceType(row.deviceType as DeviceType)} text-2xl`} />
        {`${row.targetOS} ${row.targetVersion}(${row.apiVersion})`}
      </div>
    ),
    minWidth: 200,
  },
  {
    title: 'API Version',
    key: 'apiVersion',
    sorter: (a, b) => Number(a.apiVersion) - Number(b.apiVersion),
    minWidth: 120,
    render: row => `API${row.apiVersion}`,
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
    filterOptions: [
      { label: '未下载', value: 'remote' },
      { label: '已下载', value: 'local' },
    ],
    filter: (value, row) => row.imageType === value,
    render: row => row.imageType === 'remote'
      ? (
          <NButton size="small" disabled={!canDownload.value} type="primary" onClick={() => downloadImage(row)}>
            {{ default: () => t('download'), icon: () => <div class="i-ph-download-duotone" /> }}
          </NButton>
        )
      : (
          <div class="flex items-center gap-3">
            <NButton
              size="small"
              type="info"
              disabled={!canDownload.value}
              onClick={() => router.push({
                path: '/device-manager/create-device',
                query: { imagePath: row.path },
              })}
            >
              {{ default: () => t('create'), icon: () => <div class="i-ph-plus" /> }}
            </NButton>
            <NButton size="small" type="error" disabled={!canDownload.value} onClick={() => deleteLocalImage(row)}>
              {{ default: () => t('delete'), icon: () => <div class="i-ph-trash-duotone" /> }}
            </NButton>
          </div>
        ),
  },
]

const { data: images, loading, execute: requestRemoteImageList } = useAsyncData(async () => {
  return await connection.requestRemoteImageList?.().then(res => res.images)
})
onDidRefresh(() => requestRemoteImageList())

function downloadImage(serializedImage: RemoteImage.Stringifiable) {
  connection.requestRemoteImageDownload?.(serializedImage)
}

function deleteLocalImage(serializedLocalImage: LocalImage.Stringifiable) {
  connection.deleteLocalImage?.(serializedLocalImage)
}
</script>

<template>
  <div>
    <Heading back :title="$t('hdcManager.imageManager.title')">
      <NButton type="primary" @click="requestRemoteImageList">
        {{ $t('refresh') }}
        <template #icon><div class="i-ph-arrow-clockwise-duotone" /></template>
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
