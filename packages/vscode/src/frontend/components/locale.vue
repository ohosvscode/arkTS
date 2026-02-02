<script lang="tsx" setup>
import type { SelectMixedOption } from 'naive-ui/es/select/src/interface'

const model = defineModel<{ language: string, region?: string }>({ default: () => ({ language: '', region: undefined }) })
const regionMode = ref<'all' | 'specific'>('specific')
const handleChange = (e: Event) => regionMode.value = (e.target as HTMLInputElement).value as 'all' | 'specific'
const localeData = useLocaleData()
const languages = computed((): SelectMixedOption[] => localeData.getLanguages().map(item => ({ label: `${item.name} (${item.iso_639_1})`, value: item.iso_639_1, flags: item.flags })))
const regions = computed((): SelectMixedOption[] => localeData.getRegions(regionMode.value === 'specific' ? model.value.language : undefined).map(item => ({ label: `${item.flag ? `${item.flag} ` : ''}${item.name} (${item.code})`, value: item.code })))

function renderLanguageLabel(option: SelectMixedOption & { flags?: string[] }, selected?: boolean) {
  if (selected) return `${option.label} ${option.flags ? option.flags?.join(' ') : ''}`
  return (
    <div class="flex flex-col py1">
      {option.label}
      {option.flags ? <div class="op-70 text-wrap">{option.flags?.join(' ')}</div> : void 0}
    </div>
  )
}
</script>

<template>
  <CollapseSection :description="$t('qualifierEditor.locale.description')">
    <NForm mt-5>
      <NFormItem :label="$t('qualifierEditor.locale.language')">
        <NSelect v-model:value="model.language" :render-label="renderLanguageLabel" :options="languages" />
      </NFormItem>
      <NFormItem :label="$t('qualifierEditor.locale.region')">
        <NSelect v-model:value="model.region" :options="regions" clearable />
      </NFormItem>
      <NFormItem :show-label="false">
        <NRadio
          name="regionMode"
          :checked="regionMode === 'all'"
          value="all"
          @change="handleChange"
        >
          {{ $t('qualifierEditor.locale.region.all') }}
        </NRadio>
        <NRadio
          name="regionMode"
          :checked="regionMode === 'specific'"
          value="specific"
          @change="handleChange"
        >
          {{ $t('qualifierEditor.locale.region.specific') }}
        </NRadio>
      </NFormItem>
    </NForm>
  </CollapseSection>
</template>
