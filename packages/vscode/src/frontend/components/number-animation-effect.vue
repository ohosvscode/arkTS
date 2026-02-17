<script setup lang="ts">
const { to, precision = 2 } = defineProps<{
  to: number
  precision?: number
}>()
const from = ref(0)
watch(() => to, (_, oldVal) => from.value = oldVal)
</script>

<template>
  <NNumberAnimation :from="from" :to="to" :precision="precision" />
</template>
