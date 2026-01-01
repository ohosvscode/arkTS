<script setup lang="ts">
import type { FormInst } from 'naive-ui'

const model = defineModel<{ colorMode: string }>({ default: () => ({ colorMode: 'light' }) })
const handleChange = (e: Event) => model.value.colorMode = (e.target as HTMLInputElement).value
const formRef = useTemplateRef<FormInst>('formRef')
</script>

<template>
  <CollapseSection :description="$t('qualifierEditor.colorMode.description')" :form-ref="formRef">
    <NForm ref="formRef" mt-5 :rules="{ colorMode: { required: true } }">
      <NFormItem path="colorMode" :show-label="false">
        <NRadio name="colorMode" :checked="model.colorMode === 'light'" value="light" @change="handleChange">
          {{ $t('qualifierEditor.colorMode.light') }}
        </NRadio>
        <NRadio name="colorMode" :checked="model.colorMode === 'dark'" value="dark" @change="handleChange">
          {{ $t('qualifierEditor.colorMode.dark') }}
        </NRadio>
      </NFormItem>
    </NForm>
  </CollapseSection>
</template>
