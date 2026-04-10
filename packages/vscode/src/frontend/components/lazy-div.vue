<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  condition: boolean
}>()

const hasLoaded = ref(false)

const stop = watch(
  () => props.condition,
  (val) => {
    if (val) {
      hasLoaded.value = true
      stop()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="hasLoaded" v-show="props.condition">
    <slot />
  </div>
</template>
