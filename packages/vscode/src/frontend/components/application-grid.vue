<script setup lang="ts">
import type { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'

defineProps<{
  applications: HdcManagerConnectionProtocol.ServerFunction.GetApplications.Application[]
  remoteApplicationInfos: Partial<HdcManagerConnectionProtocol.ServerFunction.GetRemoteApplicationInfo.Response>[]
}>()

const emit = defineEmits<{
  (e: 'select', application: HdcManagerConnectionProtocol.ServerFunction.GetApplications.Application): void
}>()
</script>

<template>
  <div class="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(64px,1fr))] justify-items-center w-full">
    <div v-for="(application, index) in applications" :key="index" class="flex w-full min-w-0 max-w-16 flex-col items-center justify-center gap-1 cursor-pointer" @click="emit('select', application)">
      <NImage class="size-10 shrink-0" :src="remoteApplicationInfos[index]?.icon" :alt="remoteApplicationInfos[index]?.name ?? application.bundleName" lazy preview-disabled />
      <div class="w-full min-w-0 text-center text-xs leading-tight line-clamp-1" :title="remoteApplicationInfos[index]?.name ?? application.bundleName">
        {{ remoteApplicationInfos[index]?.name ?? application.bundleName }}
      </div>
    </div>
  </div>
</template>
