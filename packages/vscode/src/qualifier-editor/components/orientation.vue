<script lang="ts" setup>
import type { FormInst } from 'naive-ui'

const model = defineModel<{ value: string }>({ default: () => ({ value: 'vertical' }) })
const formRef = useTemplateRef<FormInst>('formRef')
const handleChange = (e: Event) => model.value.value = (e.target as HTMLInputElement).value
</script>

<template>
  <CollapseSection :description="$t('qualifierEditor.orientation.description')" :form-ref="formRef">
    <NForm ref="formRef" mt-5 label-placement="left">
      <NFormItem :show-label="false">
        <NRadio name="orientation" :checked="model.value === 'vertical'" value="vertical" @change="handleChange">
          {{ $t('qualifierEditor.orientation.vertical') }}
        </NRadio>
        <NRadio name="orientation" :checked="model.value === 'horizontal'" value="horizontal" @change="handleChange">
          {{ $t('qualifierEditor.orientation.horizontal') }}
        </NRadio>
      </NFormItem>
    </NForm>
  </CollapseSection>
</template>
