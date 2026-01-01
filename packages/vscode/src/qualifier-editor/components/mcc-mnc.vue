<script lang="ts" setup>
import type { FormInst } from 'naive-ui'

const model = defineModel<{ mcc: string[], mnc: string[] }>({ default: () => ({ mcc: [], mnc: [] }) })
const formRef = useTemplateRef<FormInst>('formRef')
</script>

<template>
  <CollapseSection :description="$t('qualifierEditor.mccAndMnc.description')" :form-ref="formRef">
    <NForm ref="formRef" mt-5 label-placement="left">
      <NFormItem :label="$t('qualifierEditor.mccAndMnc.mcc')">
        <NInputOtp
          v-model:value="model.mcc"
          :allow-input="char => char.match(/^[0-9]$/) !== null"
          :length="3"
        />
      </NFormItem>
      <NFormItem :label="$t('qualifierEditor.mccAndMnc.mnc')">
        <NInputOtp
          v-model:value="model.mnc"
          :allow-input="char => char.match(/^[0-9]$/) !== null"
          :length="3"
        />
      </NFormItem>
    </NForm>
  </CollapseSection>
</template>
