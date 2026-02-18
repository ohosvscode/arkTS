<script setup lang="ts">
defineProps<{
  icon: string
  content: string
  tooltip: string
}>()
</script>

<template>
  <NTooltip>
    {{ tooltip }}
    <template #trigger>
      <NTag :color="{ color: 'none' }" size="small">
        <NIcon mr1>
          <div :class="icon" font-size="16px" />
        </NIcon>
        {{ content }}
      </NTag>
    </template>
  </NTooltip>
</template>
