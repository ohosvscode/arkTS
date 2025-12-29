<script setup lang="ts">
import type { UseOffsetPaginationReturn } from '@vueuse/core'
import type { UnwrapNestedRefs } from 'vue'
import type { ProjectConnectionProtocol } from '../interfaces/connection-protocol'

const totalCount = ref(0)
const resultList = ref<ProjectConnectionProtocol.ServerFunction.RequestTemplateMarketList.Response.Result[]>([])
const viewMode = ref<'list' | 'grid'>('list')
const isLoading = ref(false)
const error = ref<Error | null>(null)
const { isOnline } = useNetwork()

async function fetchData(returnValue?: UnwrapNestedRefs<UseOffsetPaginationReturn>) {
  try {
    isLoading.value = true
    const response = await window.connection.requestTemplateMarketList({
      pageIndex: returnValue?.currentPage,
      pageSize: returnValue?.currentPageSize,
    })
    totalCount.value = response.totalCount
    resultList.value.push(...response.resultList)
  }
  catch (err) {
    error.value = err as Error
  }
  finally {
    isLoading.value = false
  }
}
await fetchData()

const { currentPage } = useOffsetPagination({
  total: computed(() => totalCount.value ?? 0),
  pageSize: 10,
  onPageChange: fetchData,
  onPageSizeChange: fetchData,
  onPageCountChange: fetchData,
})
const { arrivedState } = useScroll(document)
watch(() => arrivedState.bottom, () => arrivedState.bottom ? currentPage.value++ : void 0)
watch(isOnline, newValue => newValue === true ? error.value = null : null)
</script>

<template>
  <div>
    <Heading :title="$t('project.templateMarket.title')" back>
      <NTabs v-model:value="viewMode" type="segment" size="large">
        <NTab name="list" class="p0! m0!">
          <NIcon m2 flex="~ gap-2 items-center"><div i-ph-list-duotone font-size="2xl" /></NIcon>
        </NTab>
        <NTab name="grid" class="p0! m0!">
          <NIcon m2 flex="~ gap-2 items-center">
            <div i-ph-squares-four-duotone font-size="2xl" />
          </NIcon>
        </NTab>
      </NTabs>
    </Heading>

    <div gap-2 :class="viewMode === 'grid' ? 'columns-2' : ''" transition="all duration-300">
      <NCard
        v-for="(item, index) in resultList" :key="index" size="small"
        break-inside-avoid mb-2 transition="all duration-300"
        cursor-pointer hover:bg="[var(--vscode-inputOption-hoverBackground)]"
        hover:transform="scale-100.5" active:transform="scale-99.5"
      >
        <TemplateItem :data="item" :view-mode transition="all duration-300" />
      </NCard>
    </div>

    <div v-if="isLoading" flex="~ justify-center items-center" my-10>
      <LoadingSpinner direction="horizontal" />
    </div>
    <div v-else-if="!isOnline" flex="~ justify-center items-center" my-10>
      <div flex="~ col gap-2 items-center" p-4 rounded bg="[var(--vscode-editor-background)]">
        <div i-ph-warning-duotone font-size="2xl" />
        <div>{{ $t('noNetwork') }}</div>
      </div>
    </div>
    <div v-else-if="error" flex="~ justify-center items-center" my-10>
      <div flex="~ col gap-2 items-center" p-4 rounded bg="[var(--vscode-editor-background)]">
        <div i-ph-warning-duotone font-size="2xl" />
        <div>{{ error.message }}</div>
        <NButton type="primary" @click="error = null">{{ $t('retry') }}</NButton>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: Default
  throwErrorIfNoNetwork: true
</route>
