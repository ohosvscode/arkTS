<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div flex="~ col-reverse md:row gap-3">
    <div flex="~ col" w-full>
      <NForm size="small" label-placement="left">
        <slot />
      </NForm>
    </div>
    <NCard size="small" w="full md:45%" :title="title">
      {{ description }}
    </NCard>
  </div>
</template>
