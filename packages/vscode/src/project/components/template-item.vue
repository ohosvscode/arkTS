<script setup lang="ts">
import type { ProjectConnectionProtocol } from '../interfaces/connection-protocol'

const props = defineProps<{
  data: ProjectConnectionProtocol.ServerFunction.RequestTemplateMarketList.Response.Result
  viewMode: 'list' | 'grid'
}>()

async function handleUseTemplate() {
  const response = await window.connection.requestTemplateMarketDetail(props.data.productId)
  const fileUrl = response.result.productTemplateList?.[0]?.fileUrl
  if (!fileUrl) return
  await window.connection.downloadAndExtractTemplate(fileUrl)
}
</script>

<template>
  <div :class="viewMode === 'grid' ? 'flex flex-col' : 'flex flex-row'" gap-16px @click="$router.push(`/template-detail?productId=${data.productId}`)">
    <div flex="~ col gap-2 justify-between items-center">
      <NCarousel touchable max-w-20 max-h-40>
        <NCarouselItem v-for="(image, imageIndex) in data.productPublicizePicList" :key="imageIndex">
          <NImage :src="image.picUrl" object-fit="cover" rounded-2px />
        </NCarouselItem>
      </NCarousel>
      <NButton v-if="viewMode === 'grid'" type="primary" block @click.stop="handleUseTemplate">
        使用此模版
      </NButton>
    </div>

    <div w-full flex="~ col" :class="viewMode === 'grid' ? 'gap-2 justify-around' : 'gap-4'">
      <NH2 class="text-lg font-bold mb0">
        {{ data.productName }}
      </NH2>
      <NText>{{ data.briefInfo }}</NText>
      <div flex="~ col gap-2">
        <div flex="~ gap-2 items-center wrap">
          <TemplateTag v-if="data.licenseName" icon="i-ph-certificate-duotone" :content="data.licenseName" :tooltip="`开源协议: ${data.licenseName}`" />
          <TemplateTag icon="i-ph-git-commit-duotone" :content="`v${data.version}`" :tooltip="`版本: v${data.version}`" />
          <TemplateTag icon="i-ph-clock-duotone" :content="data.updateTime" :tooltip="`更新时间: ${data.updateTime}`" />
          <TemplateTag icon="i-ph-star-duotone" :content="data.score" :tooltip="`评分: ${data.score}`" />
          <TemplateTag v-if="data.companyName" icon="i-ph-building-duotone" :content="data.companyName" :tooltip="`发行方: ${data.companyName}`" />
          <TemplateTag icon="i-ph-download-duotone" :content="data.saleNum.toString()" :tooltip="`${data.saleNum}次下载`" />
        </div>
      </div>
    </div>

    <NButton v-if="viewMode === 'list'" type="primary" size="small" @click.stop="handleUseTemplate">
      使用此模版
    </NButton>
  </div>
</template>
