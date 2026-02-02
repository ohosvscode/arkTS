<script lang="ts" setup>
const connection = useHdcConnection()
const hdcPath = await connection.getHdcPath?.() ?? ''
const copyHdcPathToClipboard = () => hdcPath && connection.copyTextToClipboard?.(hdcPath)
</script>

<template>
  <div>
    <Heading :title="$t('hdcManager.title')">
      <NButton type="info" @click="$router.push('/device-manager')">
        <template #icon><div class="i-ph-devices-duotone" /></template>
        {{ $t('hdcManager.deviceManager') }}
      </NButton>
      <NTooltip cursor-pointer>
        <template #trigger>
          <NButton :disabled="!hdcPath" type="primary" @click="copyHdcPathToClipboard">
            <template #icon><div class="i-ph-folder-simple-duotone" /></template>
            {{ $t('hdcManager.copyHdcPath') }}
          </NButton>
        </template>
        <div>{{ hdcPath }}</div>
      </NTooltip>
    </Heading>

    <div v-if="!hdcPath">
      <NResult v-if="!hdcPath" description="没有将hdc命令设置为环境变量或未设置 ets.sdkPath, 请先将其设置为环境变量或设置IDE的 ets.sdkPath 选项后重试。" />
    </div>
  </div>
</template>
