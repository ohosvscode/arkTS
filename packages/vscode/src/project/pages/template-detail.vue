<script setup lang="ts">
import type { ProjectConnectionProtocol } from '../interfaces/connection-protocol'
import MarkdownIt from 'markdown-it'

const route = useRoute()
const productId = route.query.productId as string
if (typeof productId !== 'string') throw new Error('productId is required.')

const isLoading = ref(false)
const error = ref<Error | null>(null)
const isDark = usePreferredDark()
const data = ref<ProjectConnectionProtocol.ServerFunction.RequestTemplateMarketDetail.Response.Result | null>(null)

async function fetchData() {
  try {
    isLoading.value = true
    const response = await window.connection.requestTemplateMarketDetail(productId)
    data.value = response.result
  }
  catch (err) {
    error.value = err as Error
    console.error(err)
  }
  finally {
    isLoading.value = false
  }
}
await fetchData()

const md = new MarkdownIt({
  linkify: true,
  typographer: true,
})
const detailFiles = computed<ProjectConnectionProtocol.ServerFunction.RequestTemplateMarketDetail.Response.Result.DetailFile>(() => {
  try {
    return JSON.parse(data.value?.productEntity.detailFiles ?? '{}')
  }
  catch {
    return []
  }
})
md.renderer.rules.image = (tokens, idx, _options, _env, _self) => {
  const token = tokens[idx]
  const src = token.attrGet('src')?.split('cid:')[1]
  const currentFile = detailFiles.value.image?.find(image => image.fileName === src)
  if (!currentFile) return ''
  return `<img src="${currentFile.filePath}" />`
}
const details = computed(() => md.render(data.value?.productEntity.details ?? ''))

async function handleUseTemplate(fileUrl: string) {
  if (!fileUrl) return
  try {
    await window.connection.downloadAndExtractTemplate(fileUrl)
  }
  catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <div>
    <Heading :title="$t('project.templateMarket.templateDetail')" back>
      <NText op-70>productId: {{ productId }}</NText>
    </Heading>

    <div v-if="isLoading" flex="~ justify-center items-center" my-10>
      <LoadingSpinner />
    </div>

    <div v-else-if="error" flex="~ justify-center items-center" my-10>
      <div flex="~ col gap-2 items-center" p-4 rounded bg="[var(--vscode-editor-background)]">
        <div i-ph-warning-duotone font-size="2xl" />
        <div>{{ error.message }}</div>
      </div>
    </div>

    <div v-else>
      <NCard>
        <div flex="~ gap-4">
          <NCarousel touchable w="auto!">
            <NCarouselItem v-for="(image, imageIndex) in data?.productPublicizePicList ?? []" :key="imageIndex" max-w-40>
              <NImage :src="image.picUrl" object-fit="cover" rounded-2px transition="all duration-300" />
            </NCarouselItem>
          </NCarousel>

          <div>
            <NH2 mb0>{{ data?.productEntity.productName ?? $t('project.templateMarket.noProductName') }}</NH2>
            <NP>{{ data?.productEntity.briefInfo ?? $t('project.templateMarket.noBriefInfo') }}</NP>

            <div flex="~ col gap-2">
              <div flex="~ gap-2 items-center wrap">
                <TemplateTag icon="i-ph-git-commit-duotone" :content="`v${data?.productTemplateList?.[0]?.version ?? ''}`" :tooltip="`最新版本: v${data?.productTemplateList?.[0]?.version ?? ''}`" />
                <TemplateTag icon="i-ph-clock-duotone" :content="data?.productEntity.updateTime ?? ''" :tooltip="`更新时间: ${data?.productEntity.updateTime}`" />
                <TemplateTag icon="i-ph-star-duotone" :content="data?.productEntity.score?.toString() ?? ''" :tooltip="`评分: ${data?.productEntity.score}`" />
                <TemplateTag icon="i-ph-building-duotone" :content="data?.productEntity.companyName ?? ''" :tooltip="`发行方: ${data?.productEntity.companyName}`" />
                <TemplateTag icon="i-ph-download-duotone" :content="data?.productEntity.saleNum?.toString() ?? ''" :tooltip="`${data?.productEntity.saleNum}次下载`" />
              </div>
            </div>

            <NButton type="primary" mt-5 @click="handleUseTemplate(data?.productTemplateList?.[0]?.fileUrl ?? '')">使用此模版</NButton>
          </div>
        </div>

        <NTabs mt-3>
          <NTabPane :name="$t('project.templateMarket.detail')">
            <article
              :class="isDark ? `prose prose-light` : 'prose-dark'" w="full"
              max-w="none" text="[var(--vscode-foreground)]" prose-headings="mt-1 mb-2 text-[var(--vscode-foreground)]" prose-a="text-[var(--vscode-textLink-foreground)] hover:text-[var(--vscode-textLink-foreground)] decoration-none"
              prose-code="bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)]"
              prose-table="border-[var(--vscode-input-border)]" prose-pre="bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)]"
              v-html="details"
            />
          </NTabPane>
          <NTabPane :name="$t('project.templateMarket.versionHistory')" flex="~ col gap-2">
            <div v-for="(template, templateIndex) in data?.productTemplateList ?? []" :key="templateIndex">
              <NH2 m0 p0>{{ template.version }}</NH2>
              <NP m0 p0>{{ template.desc }}</NP>
              <NButton type="primary" mt-5 @click="handleUseTemplate(template.fileUrl)">使用此模版</NButton>
              <hr v-if="templateIndex !== (data?.productTemplateList?.length ?? 0) - 1" op-50 mt-3>
            </div>
          </NTabPane>
        </NTabs>
      </NCard>
    </div>
  </div>
</template>
