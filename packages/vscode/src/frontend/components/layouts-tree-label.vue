<script setup lang="tsx">
const props = defineProps<{
  attributes: Record<string, string>
}>()

const showAttributes = ['clip', 'displayId', 'id']
const attributes = computed(() => showAttributes.filter(attrName => props.attributes[attrName as keyof typeof props.attributes]))
</script>

<template>
  <span>
    <span class="text-[#5db0d7]">{{ props.attributes.type ? `${props.attributes.type}() ` : 'Layout() ' }}</span>
    <span v-for="(attrName, index) in attributes" :key="index">
      <span class="text-[#9bbbdc]">{{ attrName }}="</span>
      <span class="text-[#f29766]">{{ props.attributes[attrName as keyof typeof props.attributes] }}</span>
      <span class="text-[#9bbbdc]">"</span>
      <template v-if="index !== attributes.length - 1">&nbsp;</template>
    </span>
  </span>
</template>
