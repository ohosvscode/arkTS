<script setup lang="ts">
const mccAndMnc = reactive({ mcc: [], mnc: [] })
const locale = reactive({ language: 'zh', region: undefined })
const orientation = reactive({ value: 'vertical' })
const device = reactive({ device: 'phone' })
const colorMode = reactive({ colorMode: 'light' })
const density = reactive({ density: 'sdpi' })
const qualifiers = reactive({
  mccAndMnc: {
    checked: false,
    value: computed(() => `${mccAndMnc.mcc.join('') ? `mcc${mccAndMnc.mcc.join('')}` : ''}${mccAndMnc.mnc.join('') ? `_mnc${mccAndMnc.mnc.join('')}` : ''}`),
  },
  locale: {
    checked: false,
    value: computed(() => locale.region ? `${locale.language}_${locale.region}` : locale.language),
  },
  orientation: {
    checked: false,
    value: computed(() => orientation.value),
  },
  device: {
    checked: false,
    value: computed(() => device.device),
  },
  colorMode: {
    checked: false,
    value: computed(() => colorMode.colorMode),
  },
  density: {
    checked: false,
    value: computed(() => density.density),
  },
})
const value = computed(() => Object.entries(qualifiers)
  .filter(([_, value]) => value.checked)
  .map(([_, value]) => value.value)
  .join('-'))
const willCreateDirectories = reactive({
  element: true,
  media: true,
  profile: true,
})

const containerRef = ref<HTMLDivElement | null>(null)
const headerRef = ref<HTMLDivElement | null>(null)
const { width: containerWidth } = useElementSize(containerRef)
const isHeaderVisible = useElementVisibility(headerRef)
const { width: windowWidth } = useWindowSize()
const lessThanSm = computed(() => windowWidth.value <= 640)
const isFixed = computed(() => lessThanSm.value ? true : isHeaderVisible.value)
const resourceRelativeFsPath = ref('')
onMounted(async () => resourceRelativeFsPath.value = await window.connection.getResourceRelativeFsPath() ?? '')

async function submit() {
  window.connection.submit({
    qualifierDirectoryName: value.value,
    subdirectoryNames: [willCreateDirectories.element ? 'element' : '', willCreateDirectories.media ? 'media' : '', willCreateDirectories.profile ? 'profile' : ''].filter(Boolean),
  })
}
</script>

<template>
  <div ref="containerRef">
    <div ref="headerRef">
      <Heading :title="$t('qualifierEditor.title')">
        <NButton type="primary" :disabled="!value" @click="submit">
          <template #icon>
            <div class="i-ph-floppy-disk-duotone" />
          </template>
          {{ $t('create') }}
        </NButton>
      </Heading>
      <div class="op-70" v-html="$t('qualifierEditor.description')" />
    </div>

    <!-- This mt-5 is for the padding of the container. -->
    <div mt-5 flex="~ col-reverse sm:row justify-center gap-5">
      <NCollapse w-full arrow-placement="right" :trigger-areas="['arrow', 'main']">
        <NCollapseItem :title="$t('qualifierEditor.mccAndMnc')">
          <template #header-extra>
            <NSwitch v-model:value="qualifiers.mccAndMnc.checked" />
          </template>
          <MccMnc v-model="mccAndMnc" />
        </NCollapseItem>
        <NCollapseItem :title="$t('qualifierEditor.locale')">
          <template #header-extra>
            <NSwitch v-model:value="qualifiers.locale.checked" />
          </template>
          <Locale v-model="locale" />
        </NCollapseItem>
        <NCollapseItem :title="$t('qualifierEditor.orientation')">
          <template #header-extra>
            <NSwitch v-model:value="qualifiers.orientation.checked" />
          </template>
          <Orientation v-model="orientation" />
        </NCollapseItem>
        <NCollapseItem :title="$t('qualifierEditor.device')">
          <template #header-extra>
            <NSwitch v-model:value="qualifiers.device.checked" />
          </template>
          <Device v-model="device" />
        </NCollapseItem>
        <NCollapseItem :title="$t('qualifierEditor.colorMode')">
          <template #header-extra>
            <NSwitch v-model:value="qualifiers.colorMode.checked" />
          </template>
          <ColorMode v-model="colorMode" />
        </NCollapseItem>
        <NCollapseItem :title="$t('qualifierEditor.density')">
          <template #header-extra>
            <NSwitch v-model:value="qualifiers.density.checked" />
          </template>
          <Density v-model="density" />
        </NCollapseItem>
      </NCollapse>

      <div w-full relative transition="all">
        <div transition="all duration-300" :style="{ width: lessThanSm ? '100%' : `${containerWidth / 2}px`, top: isFixed ? '' : '20px' }" :class="isFixed ? '' : 'fixed'">
          <NH2 text="4" font="500" mb="1 sm:2">{{ $t('qualifierEditor.resourceUri') }}</NH2>
          <div op-70>{{ resourceRelativeFsPath }}</div>
          <NH2 text="4" font="500" mb="1 sm:2">{{ $t('qualifierEditor.willCreateDirectories') }}</NH2>
          <div mb="5">
            <NCheckbox v-model:checked="willCreateDirectories.element">Element</NCheckbox>
            <NCheckbox v-model:checked="willCreateDirectories.media">Media</NCheckbox>
            <NCheckbox v-model:checked="willCreateDirectories.profile">Profile</NCheckbox>
          </div>
          <NH2 text="4" font="500" mb="1 sm:2" mt-0>{{ $t('qualifierEditor.preview') }}</NH2>
          <div w-full h-fit transition="all duration-300" mb="2 sm:4" flex="~ justify-center" class="bg-[var(--vscode-input-background)] rounded" p="y3">
            <div v-if="value" transition="all duration-300" text="3.5" font="bold" class="bg-[var(--vscode-editor-background)] rounded" p="x-2 y-1">{{ value }}</div>
            <NEmpty v-else flex="~ row justify-center gap1" class="empty">请至少选择一个筛选器</NEmpty>
          </div>
          <div op-70 text="2.5 sm:3.2">
            <a :href="$t('qualifierEditor.docs.resource-link')" target="_blank" flex="~ items-center gap-1">
              <div i-ph-share-fat-duotone />
              {{ $t('qualifierEditor.docs.resource') }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty :deep(.n-empty__description) {
  margin-top: 0 !important;
}

.empty :deep(.n-empty__icon) {
  font-size: 24px !important;
  width: 24px !important;
  height: 24px !important;
  line-height: 24px !important;
}
</style>
