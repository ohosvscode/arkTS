<script setup lang="ts">
import type { DataTableColumn } from 'naive-ui'
import type { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'

const { connection, onSetApplicationViewType } = useHdcConnection()
const currentDevice = inject<Ref<string | undefined>>('currentDevice')
const applicationViewType = ref<HdcManagerConnectionProtocol.ClientFunction.ApplicationViewType>('grid')
onSetApplicationViewType(type => applicationViewType.value = type)

const applications = ref<HdcManagerConnectionProtocol.ServerFunction.GetApplications.Application[]>([])
const remoteApplicationInfos = ref<Partial<HdcManagerConnectionProtocol.ServerFunction.GetRemoteApplicationInfo.Response>[]>([])

const loading = ref(true)
const loadingDescription = ref('Loading local application information...')
async function getApplications() {
  try {
    loading.value = true
    if (!currentDevice?.value) return
    const response = await connection.getApplications?.(currentDevice.value)
    applications.value = response?.applications ?? []
    loadingDescription.value = 'Loading remote application information...'
    remoteApplicationInfos.value = await Promise.allSettled(
      applications.value.map(app => connection.getRemoteApplicationInfo?.(app.bundleName)),
    ).then(results => results.map(result => result.status === 'fulfilled' ? result.value : {}))
  }
  finally {
    loading.value = false
    loadingDescription.value = 'Loading local application information...'
  }
}
getApplications()

const selectedApp = ref<string | undefined>(undefined)
const splitSize = ref(1)
const selectedAppInfo = computed(() => applications.value.find(app => app.bundleName === selectedApp.value))
const selectedRemoteAppInfo = computed(() => selectedAppInfo.value ? remoteApplicationInfos.value[applications.value.findIndex(app => app.bundleName === selectedApp.value)] : undefined)

function selectApp(app: HdcManagerConnectionProtocol.ServerFunction.GetApplications.Application) {
  selectedApp.value = app.bundleName
  window.scroll({ top: 0, behavior: 'smooth' })
  if (splitSize.value === 1) splitSize.value = 0.65
}

function startAbility() {
  if (!currentDevice?.value || !selectedAppInfo?.value || !selectedAppInfo.value.mainAbility) return
  connection.startAbility?.(currentDevice.value, selectedAppInfo.value.bundleName, selectedAppInfo.value.mainAbility)
}

const columns = ref<DataTableColumn[]>([
  { key: 'name', title: '应用名' },
  { key: 'bundleName', title: '包名' },
  { key: 'versionName', title: '版本' },
  { key: 'installTime', title: '安装时间', render: row => row.installTime ? new Date(Number(row.installTime)).toLocaleDateString() : '' },
  { key: 'mainEntry', title: '主模块' },
  { key: 'mainAbility', title: '主Ability' },
  { key: 'vendor', title: '厂商' },
  { key: 'apiTargetVersion', title: 'API 目标版本' },
  { key: 'releaseType', title: '发布类型' },
])
</script>

<template>
  <!-- z-index layer -->
  <div>
    <!-- loading -->
    <div v-if="loading" class="fixed top-0 left-0 size-full backdrop-blur-99999 flex items-center justify-center z-10">
      <NSpin :description="loadingDescription" />
    </div>

    <!-- main content layer -->
    <NSplit v-model:size="splitSize" class="flex" :max="selectedApp ? 0.85 : 1" :min="selectedApp ? 0.3 : 1">
      <template #1>
        <ApplicationGrid
          v-if="applicationViewType === 'grid'"
          class="mt-2"
          :applications="applications"
          :remote-application-infos="remoteApplicationInfos"
          @select="selectApp"
        />
        <NDataTable
          v-else-if="applicationViewType === 'list'"
          :columns="columns"
          :data="applications"
        />
      </template>
      <template #2>
        <div class="p-2 text-wrap mt-2">
          <NImage :src="selectedRemoteAppInfo?.icon" class="w-16 h-16" preview-disabled lazy />
          <NH1 class="text-lg m-0 text-wrap">{{ selectedRemoteAppInfo?.name ?? selectedAppInfo?.bundleName }}</NH1>
          <div class="mt-1">
            <NButton type="primary" size="tiny" @click="startAbility">
              <template #icon>
                <div class="i-ph-play-duotone" />
              </template>
              启动
            </NButton>
          </div>
          <div class="text-wrap op-70">包名: {{ selectedAppInfo?.bundleName }}</div>
          <div v-if="selectedAppInfo?.versionName" class="text-wrap op-70">版本: {{ selectedAppInfo?.versionName }}</div>
          <div v-if="selectedAppInfo?.installTime" class="text-wrap op-70">安装时间: {{ selectedAppInfo?.installTime }}</div>
          <div v-if="selectedAppInfo?.mainEntry" class="text-wrap op-70">主模块: {{ selectedAppInfo?.mainEntry }}</div>
          <div v-if="selectedAppInfo?.mainAbility" class="text-wrap op-70">主Ability: {{ selectedAppInfo?.mainAbility }}</div>
          <div v-if="selectedAppInfo?.vendor" class="text-wrap op-70">厂商: {{ selectedAppInfo?.vendor }}</div>
          <div v-if="selectedAppInfo?.apiTargetVersion" class="text-wrap op-70">API 目标版本: {{ selectedAppInfo?.apiTargetVersion }}</div>
          <div v-if="selectedAppInfo?.releaseType" class="text-wrap op-70">发布类型: {{ selectedAppInfo?.releaseType }}</div>

          <div v-if="selectedRemoteAppInfo?.developerName" class="text-wrap op-70">开发者: {{ selectedRemoteAppInfo?.developerName }}</div>
          <div v-if="selectedRemoteAppInfo?.kindName && selectedRemoteAppInfo?.kindTypeName" class="text-wrap op-70">类型：{{ selectedRemoteAppInfo?.kindName }} {{ selectedRemoteAppInfo?.kindTypeName }}</div>
          <div v-if="selectedRemoteAppInfo?.description" class="text-wrap op-70 whitespace-pre">描述: {{ selectedRemoteAppInfo?.description }}</div>
        </div>
      </template>
      <template #resize-trigger>
        <div class="h-full bg-[var(--vscode-panel-border)] hover:bg-[var(--vscode-sash-hoverBorder)] w-0.4 hover:w-0.9 transition-all duration-300" />
      </template>
    </NSplit>
  </div>
</template>
