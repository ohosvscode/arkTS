<script setup lang="ts">
defineProps<{
  error: Error | null
  isThrowErrorIfNoNetwork: boolean
}>()

const route = useRoute()
const canGoBack = computed(() => route.path.split('/').filter(Boolean).length > 1)
</script>

<template>
  <div class="relative top-[-6rem] left-[-1rem] right-[-1rem] bottom-0 flex flex-col items-center justify-center gap-2 z-50 w-[calc(100%+2rem)] h-screen">
    <div v-if="error" class="flex flex-col items-center justify-center gap-2 bg-[var(--vscode-editor-background)] p-4 rounded">
      <div class="i-ph-warning-duotone font-size-10 text-[var(--vscode-errorForeground)]" />
      <div select-none>
        加载失败, 请提交 issue 或联系开发者修复此问题：
      </div>
      <a href="https://github.com/ohosvscode/arkTS/issues">
        https://github.com/ohosvscode/arkTS/issues
      </a>
      <NText v-if="error && (error.name || error.message)">
        {{ error.name }}: {{ error.message }}
      </NText>
      <NCode class="text-sm whitespace-pre-wrap">
        {{ error?.stack }}
      </NCode>
      <NButton v-if="canGoBack" type="primary" mt-2 @click="$router.back()">
        {{ $t('goback') }}
      </NButton>
    </div>

    <div v-else-if="isThrowErrorIfNoNetwork" class="flex flex-col items-center justify-center gap-2 bg-[var(--vscode-editor-background)] p-4 rounded">
      <div class="i-ph-globe-duotone font-size-10 text-[var(--vscode-errorForeground)]" />
      <div select-none>
        {{ $t('noNetwork') }}
      </div>
      <NButton v-if="canGoBack" type="primary" mt-2 @click="$router.back()">
        {{ $t('goback') }}
      </NButton>
    </div>

    <div v-else class="flex flex-col items-center justify-center gap-2">
      <LoadingSpinner size-full />
    </div>
  </div>
</template>
