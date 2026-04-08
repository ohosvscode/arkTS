<script setup lang="tsx">
import type { Key, RenderLabel, TreeOption, TreeRenderProps } from 'naive-ui/es/tree/src/interface'
import { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'

const { connection, onRefreshLayouts, onCollapseAllLayouts, onExpandAllLayouts } = useHdcConnection()
const currentDevice = inject<Ref<string | undefined>>('currentDevice')

const layouts = ref<HdcManagerConnectionProtocol.ServerFunction.CaptureScreenAndOpenPreviewer.Response>(HdcManagerConnectionProtocol.ServerFunction.CaptureScreenAndOpenPreviewer.defaultResponse)
const convertedLayouts = computed<LayoutTreeOption[]>(() => convertLayouts([layouts.value]))
const defaultSelectedKeys = computed(() => convertedLayouts.value.map(item => item.children?.map(child => child.key)).flat() as Key[])

const isLoading = ref(true)
async function getLayouts() {
  try {
    if (!currentDevice?.value) return
    isLoading.value = true
    layouts.value = await connection.captureScreenAndOpenPreviewer?.(currentDevice.value)
  }
  finally {
    isLoading.value = false
  }
}
getLayouts()
onRefreshLayouts(() => getLayouts())

interface LayoutTreeOption extends TreeOption {
  attributes: HdcManagerConnectionProtocol.ServerFunction.CaptureScreenAndOpenPreviewer.Response['attributes']
  children?: LayoutTreeOption[]
}

interface LayoutTreeRenderProps extends TreeRenderProps {
  option: LayoutTreeOption
}

function convertLayouts(layouts: HdcManagerConnectionProtocol.ServerFunction.CaptureScreenAndOpenPreviewer.Response[]): LayoutTreeOption[] {
  const options: LayoutTreeOption[] = []

  for (const layout of layouts) {
    options.push({
      key: Object.values(layout.attributes).join(''),
      children: convertLayouts(layout.children),
      isLeaf: !layout.children?.length,
      attributes: layout.attributes,
    })
  }

  return options
}

function getAllKeys(layouts: LayoutTreeOption[]): Key[] {
  const keys: Key[] = []

  for (const layout of layouts) {
    if (!layout.key) continue
    keys.push(layout.key)
    if (layout.children?.length) keys.push(...getAllKeys(layout.children))
  }

  return keys
}

const renderLabel = ((props: LayoutTreeRenderProps) => <LayoutsTreeLabel attributes={props.option.attributes} />) as RenderLabel
const expandedLeys = ref<Key[]>([])
onExpandAllLayouts(() => expandedLeys.value = getAllKeys(convertedLayouts.value))
onCollapseAllLayouts(() => expandedLeys.value = [])
</script>

<template>
  <div class="w-full">
    <NSpin v-if="isLoading" class="fixed size-full top-0 left-0 z-10 backdrop-blur-99999" show description="Loading layouts..." />
    <NTree
      v-model:expanded-keys="expandedLeys"
      :data="convertedLayouts"
      show-line
      block-line
      :theme-overrides="{ nodeWrapperPadding: '0', nodeHeight: 'inherit' }"
      class="font-mono text-[12px] tree"
      :render-label="renderLabel"
      :default-selected-keys="defaultSelectedKeys"
    />
  </div>
</template>

<style scoped>
.tree :deep(.n-tree-node-indent div) {
  width: 12px !important;
}
</style>
