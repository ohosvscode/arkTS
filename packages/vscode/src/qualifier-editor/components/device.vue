<script setup lang="ts">
import type { SelectMixedOption } from 'naive-ui/es/select/src/interface'

const model = defineModel<{ device: string }>({ default: () => ({ device: '' }) })
const { t: $t } = useI18n()

const devices: SelectMixedOption[] = [
  { label: $t('qualifierEditor.device.phone'), value: 'phone' },
  { label: $t('qualifierEditor.device.car'), value: 'car' },
  { label: $t('qualifierEditor.device.tablet'), value: 'tablet' },
  { label: $t('qualifierEditor.device.tv'), value: 'tv' },
  { label: $t('qualifierEditor.device.wearable'), value: 'wearable' },
  { label: $t('qualifierEditor.device.2in1'), value: '2in1' },
]
</script>

<template>
  <CollapseSection :description="$t('qualifierEditor.device.description')">
    <NForm mt-5>
      <NFormItem :show-label="false">
        <NSelect v-model:value="model.device" :options="devices" />
      </NFormItem>
    </NForm>
  </CollapseSection>
</template>
