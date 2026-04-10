<script lang="ts" setup>
import type { SelectMixedOption } from 'naive-ui/es/select/src/interface'
import type { HdcManagerConnectionProtocol } from '../../interfaces/hdc-connection-protocol'

const { connection } = useHdcConnection()
const { onLoop, isExecuting } = useHdcLoop()

const currentDevice = ref<string | undefined>(undefined)
provide('currentDevice', currentDevice)

const currentTab = ref<HdcManagerConnectionProtocol.ServerFunction.SetCurrentTab.Tab>('overview')
provide('currentTab', currentTab)
watch(currentTab, () => connection.setCurrentTab?.(currentTab.value), { immediate: true })

const devices = ref<string[]>([])
onLoop(async () => {
  try {
    devices.value = await connection.getConnectedDevices?.() ?? []
  }
  finally {
    if (devices.value.length > 0 && !currentDevice.value) currentDevice.value = devices.value[0]
    if (devices.value.length === 0) currentDevice.value = undefined
  }
}, true)

const deviceOptions = computed<SelectMixedOption[]>(
  () => devices.value.map(device => ({
    label: device,
    value: device,
  } satisfies SelectMixedOption)),
)
</script>

<template>
  <NEmpty v-if="devices.length === 0" :description="$t('hdcManager.noDevices')" select-none h-screen flex="~ items-center justify-center">
    <template #icon>
      <div v-if="isExecuting" i-ph-plugs-connected-duotone />
      <div v-else i-ph-plugs-duotone />
    </template>
    <template #extra>
      <NButton type="primary" size="small" @click="connection.openConnectDeviceDialog?.()">
        {{ $t('command.connectDevice') }}
        <template #icon>
          <div i-ph-plug-duotone />
        </template>
      </NButton>
    </template>
  </NEmpty>
  <div v-else class="mb-5">
    <LazyDiv :condition="currentTab === 'overview'">
      <Hilog class="mt-2" />
      <Overview />
    </LazyDiv>
    <LazyDiv :condition="currentTab === 'application'">
      <Application />
    </LazyDiv>
    <LazyDiv :condition="currentTab === 'processes'">
      <Processes />
    </LazyDiv>
    <LazyDiv :condition="currentTab === 'layouts'">
      <Layouts />
    </LazyDiv>
    <div class="main-tab-container">
      <NTabs v-model:value="currentTab" animated size="small" placement="bottom" :theme-overrides="{ tabGapSmallBar: '15px' }">
        <template #prefix>
          <NSelect v-model:value="currentDevice" class="ml-1" size="tiny" menu-size="tiny" :options="deviceOptions" />
        </template>
        <template #suffix>
          <NSpin v-if="isExecuting" :size="12" />
        </template>
        <NTab name="overview" tab="概览" display-directive="show:lazy" />
        <NTab name="application" tab="应用" display-directive="show:lazy" />
        <NTab name="processes" tab="进程" display-directive="show:lazy" />
        <NTab name="layouts" tab="布局" display-directive="show:lazy" />
      </NTabs>
    </div>
  </div>
</template>

<style>
body {
  padding: 0px 10px;
  padding-bottom: 30px;
}
</style>

<style scoped>
.main-tab-container {
  position: fixed;
  bottom: 0;
  width: 100%;
  left: 0;
  padding: 0 10px 0px 10px;
  padding-top: 0;
  z-index: 99;
  background-color: color-mix(in srgb, var(--vscode-editor-background) 95%, transparent);
  backdrop-filter: blur(20px);
}

.n-tabs :deep(.n-tabs-bar) {
  top: inherit;
}
</style>

<route lang="yaml">
meta:
  noGap: true
</route>
