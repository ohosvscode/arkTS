<script setup lang="ts">
const currentDevice = inject<Ref<string | undefined>>('currentDevice')
const loading = ref(false)
const hilogLevel = shallowRef<Array<'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'>>(['DEBUG'])
const hilogPackageName = shallowRef<string | undefined>(undefined)
const hilogProcessId = shallowRef<number | undefined>(undefined)
const { connection } = useHdcConnection()

watch([hilogLevel, hilogPackageName, hilogProcessId], ([newHilogLevel], [oldHilogLevel]) => {
  try {
    if (!currentDevice?.value) return
    loading.value = true
    if (newHilogLevel !== oldHilogLevel) connection.setLogLevel?.(hilogLevel.value, currentDevice.value)
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <NSpin size="small" :show="loading">
    <NCard class="w-full! mb-10px" size="small" content-class="p-1! px-2! flex items-center flex-wrap gap-2">
      <div class="text-nowrap">
        Hilog
      </div>
      <NButton size="tiny" type="primary" @click="connection?.openHilog?.()">
        打开
      </NButton>
      <NSelect
        v-model:value="hilogLevel" size="tiny" menu-size="tiny" class="w-auto! min-w-90px" multiple
        :theme-overrides="{ peers: { InternalSelection: { border: '1px solid var(--vscode-focusBorder)' } } }"
        :options="[
          { label: 'Debug', value: 'DEBUG' },
          { label: 'Info', value: 'INFO' },
          { label: 'Warn', value: 'WARN' },
          { label: 'Error', value: 'ERROR' },
          { label: 'Fatal', value: 'FATAL' },
        ]"
      />
      <NInput
        v-model:value="hilogPackageName"
        class="w-auto! min-w-150px"
        :theme-overrides="{ border: '1px solid var(--vscode-focusBorder)', colorFocus: 'none' }"
        size="tiny"
        placeholder="过滤包名..."
      />
      <NInputNumber
        v-model:value="hilogProcessId"
        class="w-auto! min-w-120px"
        :theme-overrides="{ peers: { Input: { border: '1px solid var(--vscode-focusBorder)', colorFocus: 'none' } } }"
        size="tiny"
        placeholder="过滤进程ID..."
        :min="0"
      />
    </NCard>
  </NSpin>
</template>
