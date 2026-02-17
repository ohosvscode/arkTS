<script setup lang="tsx">
import type { DeviceType, LocalImage, RemoteImage } from '@arkts/image-manager'
import type { TableColumns } from 'naive-ui/es/data-table/src/interface'

const { t } = useI18n()
const router = useRouter()
const loading = ref(false)
const connection = useHdcConnection()
const images = ref<(RemoteImage.Stringifiable | LocalImage.Stringifiable)[]>([])
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
            <NButton size="small" type="info" onClick={() => router.push('/device-manager/create-device')}>
              {{ default: () => t('create'), icon: () => <div class="i-ph-plus" /> }}
            </NButton>
            <NButton size="small" type="error" onClick={() => deleteLocalImage(row)}>
              {{ default: () => t('delete'), icon: () => <div class="i-ph-trash-duotone" /> }}
            </NButton>
          </div>
        ),
  },
]

async function requestRemoteImageList() {
  loading.value = true
  images.value = await connection.requestRemoteImageList?.().then(res => res.images)
  loading.value = false
}
onDidRefresh(() => requestRemoteImageList(), { immediate: true })

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
    <NDataTable :scroll-x="300" striped mt-1 size="small" :columns :data="images" :loading="loading" />
  </div>
</template>

<style scoped>
.opacity-feedback :deep(.n-form-item-feedback) {
  opacity: 0.7;
  font-size: 11.5px;
}
</style>
