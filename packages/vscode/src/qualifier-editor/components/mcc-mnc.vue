<script lang="ts" setup>
const model = defineModel<{ mcc: string[], mnc: string[] }>({ default: () => ({ mcc: [], mnc: [] }) })
</script>

<template>
  <CollapseSection :description="$t('qualifierEditor.mccAndMnc.description')">
    <NForm mt-5 label-placement="left">
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
          :disabled="!model.mcc.filter(i => i).length"
        />
      </NFormItem>
    </NForm>
  </CollapseSection>
</template>
