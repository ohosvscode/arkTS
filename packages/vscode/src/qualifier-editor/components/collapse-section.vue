<script setup lang="ts">
defineProps<{
  description: string
}>()
</script>

<template>
  <div>
    <div class="op-70" v-html="description" />
    <slot />
  </div>
</template>
