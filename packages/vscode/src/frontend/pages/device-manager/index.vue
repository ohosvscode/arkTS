<script setup lang="ts">
import { getIconByDeviceType } from '../../composables/device-type-icon'

const { t } = useI18n()
const { connection, onDidChangeDeployedEmulatorPath } = useDeviceManagerConnection()
const { data: deployedEmulatorPath } = useAsyncData(() => connection.getDeployedEmulatorPath?.())
const { data: isValidDeployedEmulatorPath } = useAsyncData(() => connection.isValidDeployedEmulatorPath?.(deployedEmulatorPath.value ?? ''))
const feedback = computed(() => {
  switch (isValidDeployedEmulatorPath.value) {
    case 'not-folder':
      return t('hdcManager.deviceManager.deployedEmulatorPath.not-folder')
    case 'not-exists':
      return t('hdcManager.deviceManager.deployedEmulatorPath.not-exists')
    case 'invalid-permission':
      return t('hdcManager.deviceManager.deployedEmulatorPath.invalid-permission')
    default:
      return t('hdcManager.deviceManager.deployedEmulatorPath.feedback')
  }
})
const canCreateDevice = computed(() => isValidDeployedEmulatorPath.value === true)

const { data: version = 'unknown' } = useAsyncData(() => connection.getImageManagerVersion?.())
const { data: isCompatible = true } = useAsyncData(() => connection.isCompatible?.())
const { data: devices, execute: getLocalDevices, loading: getLocalDevicesLoading } = useAsyncData(() => connection.getLocalDevices?.())

function deleteDevice(name: string) {
  connection.deleteDevice?.(name).finally(() => getLocalDevices())
}

onDidChangeDeployedEmulatorPath((path, isValid) => {
  deployedEmulatorPath.value = path
  isValidDeployedEmulatorPath.value = isValid
  getLocalDevices()
})

const currentSnapshot = reactive({ show: false, src: '' })
function showImagePreview(snapshot: string) {
  currentSnapshot.src = snapshot
  currentSnapshot.show = true
}
</script>

<template>
  <div>
    <Heading :title="$t('hdcManager.deviceManager.title')">
      <NButton type="info" @click="$router.push('/device-manager/image-manager')">
        <template #icon>
          <div i-ph-disc-duotone />
        </template>
        {{ $t('hdcManager.imageManager.title') }}
      </NButton>
      <NButton type="primary" @click="getLocalDevices">
        {{ $t('refresh') }}
        <template #icon>
          <div i-ph-arrow-clockwise-duotone />
        </template>
      </NButton>
    </Heading>
    <NFormItem
      size="small"
      :label="$t('hdcManager.deviceManager.deployedEmulatorPath.title')"
      label-placement="left"
      class="opacity-feedback mb-1"
      :feedback="feedback"
      :validation-status="canCreateDevice ? undefined : 'error'"
    >
      <NInput v-model:value="deployedEmulatorPath" readonly mr-2 />
      <a href="command:workbench.action.openSettings?%7B%22query%22%3A%22ets.deployedEmulatorPath%22%7D">
        <NButton text type="info">编辑</NButton>
      </a>
    </NFormItem>
    <div v-if="!isCompatible" mb-2>
      <NAlert :title="$t('hdcManager.deviceManager.compatibilityWarning.title')" type="error">
        {{ $t('hdcManager.deviceManager.compatibilityWarning.description', [version]) }}
      </NAlert>
    </div>
    <NImagePreview v-model:show="currentSnapshot.show" :src="`data:image/png;base64,${currentSnapshot.src}`" />
    <NSpin :show="getLocalDevicesLoading">
      <NList hoverable>
        <NListItem v-for="({ device, snapshot }, index) in devices ?? []" :key="index">
          <NThing :title="device.listsFileItem.content.name">
            <template #avatar>
              <div :class="`${getIconByDeviceType(device.listsFileItem.content.type)} text-2xl`" />
            </template>
            <template #description>
              <div class="flex items-center gap-2 flex-wrap mt-3">
                <NTag size="small" type="info" class="text-wrap">
                  DeviceType: {{ device.listsFileItem.content.type }}
                </NTag>
                <NTag size="small" type="info" class="text-wrap">
                  UUID: {{ device.listsFileItem.content.uuid }}
                </NTag>
                <NTag size="small" type="info" class="text-wrap">
                  CPU: {{ device.listsFileItem.content.cpuNumber }}核心
                </NTag>
                <NTag size="small" type="info" class="text-wrap">
                  RAM: {{ device.listsFileItem.content.memoryRamSize }}MB
                </NTag>
                <NTag size="small" type="info" class="text-wrap">
                  像素密度: {{ device.listsFileItem.content.density }}PPI
                </NTag>
                <NTag size="small" type="info" class="text-wrap">
                  分辨率: {{ device.listsFileItem.content.resolutionHeight }}x{{ device.listsFileItem.content.resolutionWidth }}
                </NTag>
                <NTag size="small" type="info" class="text-wrap">
                  屏幕大小: {{ device.listsFileItem.content.diagonalSize }}英寸
                </NTag>
                <NTag size="small" type="info" class="text-wrap">
                  版本: {{ device.listsFileItem.content.showVersion }}
                </NTag>
                <NTag size="small" type="info" class="text-wrap">
                  CPU/ABI: {{ device.listsFileItem.content.abi }}
                </NTag>
              </div>
            </template>
            <template #header-extra>
              <div flex="~ gap-2">
                <NButton v-if="snapshot" ghost type="primary" size="small" circle @click="showImagePreview(snapshot)">
                  <template #icon>
                    <div i-ph-camera-duotone />
                  </template>
                </NButton>
                <NButton type="primary" size="small" @click="connection.startDevice(device)">
                  启动
                  <template #icon>
                    <div i-ph-play-duotone />
                  </template>
                </NButton>
                <NButton type="error" size="small" @click="deleteDevice(device.listsFileItem.content.name)">
                  删除
                  <template #icon>
                    <div i-ph-trash-duotone />
                  </template>
                </NButton>
              </div>
            </template>
          </NThing>
        </NListItem>
      </NList>
    </NSpin>
    <div op-50 mt-2 text-2.5>
      @arkts/image-manager version: {{ version }}
    </div>
  </div>
</template>

<style scoped>
.opacity-feedback :deep(.n-form-item-feedback) {
  opacity: 0.7;
  font-size: 11.5px;
}
</style>

<style>
.n-image-preview-container .n-base-icon {
  margin: 0 8px;
  padding: 0;
}
</style>
