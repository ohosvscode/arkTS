<script setup lang="ts">
import type { SelectMixedOption } from 'naive-ui/es/select/src/interface'

const model = defineModel<{ density: string }>({ default: () => ({ density: '' }) })
const { t: $t } = useI18n()

const densities: SelectMixedOption[] = [
  { label: $t('qualifierEditor.density.sdpi'), value: 'sdpi' },
  { label: $t('qualifierEditor.density.mdpi'), value: 'mdpi' },
  { label: $t('qualifierEditor.density.ldpi'), value: 'ldpi' },
  { label: $t('qualifierEditor.density.xldpi'), value: 'xldpi' },
  { label: $t('qualifierEditor.density.xxldpi'), value: 'xxldpi' },
  { label: $t('qualifierEditor.density.xxxldpi'), value: 'xxxldpi' },
]
</script>

<template>
  <div class="op-70" v-html="$t('qualifierEditor.density.description')" />
  <NForm mt-5>
    <NFormItem :show-label="false">
      <NSelect v-model:value="model.density" :options="densities" />
    </NFormItem>
  </NForm>
</template>
