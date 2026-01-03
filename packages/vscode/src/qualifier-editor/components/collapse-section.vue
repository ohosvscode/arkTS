<script setup lang="ts">
import type { FormInst } from 'naive-ui'

defineProps<{
  description: string
  formRef?: FormInst | null
}>()
</script>

<template>
  <div>
    <div class="op-70" v-html="description" />
    <slot />
  </div>
</template>
