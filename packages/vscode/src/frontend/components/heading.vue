<script setup lang="ts">
const { title, back = false } = defineProps<{
  title: string
  back?: boolean
}>()
</script>

<template>
  <div flex="~ gap-2 justify-between items-center wrap" m="b6">
    <div v-if="back" flex="~ gap-2 items-center">
      <NButton v-if="back" circle text @click="$router.back()">
        <div i-ph-arrow-left font-size="2xl" />
      </NButton>
      <NH1 class="text-2xl font-bold m0 p0">
        {{ title }}
      </NH1>
    </div>
    <NH1 v-else class="text-2xl font-bold m0 p0">
      {{ title }}
    </NH1>
    <div v-if="$slots.default" flex="~ gap-2">
      <slot />
    </div>
  </div>
</template>
