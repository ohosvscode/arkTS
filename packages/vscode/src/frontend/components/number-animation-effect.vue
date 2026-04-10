<script setup lang="ts">
const { to, precision = 2, duration } = defineProps<{
  to: number
  precision?: number
  duration?: number
}>()
const from = ref(0)
watch(() => to, (_, oldVal) => from.value = oldVal)
</script>

<template>
  <NNumberAnimation :from="from" :to="to" :precision="precision" :duration="duration" />
</template>
