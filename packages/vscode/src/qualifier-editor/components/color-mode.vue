<script setup lang="ts">
const model = defineModel<{ colorMode: string }>({ default: () => ({ colorMode: 'light' }) })
const handleChange = (e: Event) => model.value.colorMode = (e.target as HTMLInputElement).value
</script>

<template>
  <div class="op-70" v-html="$t('qualifierEditor.colorMode.description')" />
  <NForm mt-5>
    <NFormItem :show-label="false">
      <NRadio name="colorMode" :checked="model.colorMode === 'light'" value="light" @change="handleChange">
        {{ $t('qualifierEditor.colorMode.light') }}
      </NRadio>
      <NRadio name="colorMode" :checked="model.colorMode === 'dark'" value="dark" @change="handleChange">
        {{ $t('qualifierEditor.colorMode.dark') }}
      </NRadio>
    </NFormItem>
  </NForm>
</template>
