<script setup lang="ts">
const { direction = 'vertical' } = defineProps<{
  direction?: 'horizontal' | 'vertical'
}>()
</script>

<template>
  <div :class="direction === 'vertical' ? 'flex-col' : 'flex-row'" flex="~ items-center justify-center" gap-2>
    <div :class="`${direction === 'vertical' ? 'size-10 border-t-4 border-4' : 'size-6 border-3 border-t-3'} border-solid border-t-[var(--vscode-foreground)] border-[var(--vscode-input-background)] rounded-full animate-spin`" />
    <div class="text-sm text-[var(--vscode-foreground)] pointer-events-none select-none">
      Loading...
    </div>
  </div>
</template>
