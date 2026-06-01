<script setup lang="ts">
import type { Ref } from 'vue'
import type { ProjectConfiguration } from '../../composables/project-configuration'

const { connection } = useProjectConnection()
// [新增] 加 loading 状态：homeDirectory 异步获取完成前禁用创建按钮，避免用户在数据就绪前操作
const { data: homeDirectory, loading: homeDirectoryLoading } = useAsyncData(async () => connection.getHomeDirectory?.())
const { projectConfigurations, currentProjectId, currentProject } = createProjectConfigContext(homeDirectory)
const formRef = useTemplateRef<import('naive-ui').FormInst>('formRef')
// [新增] homeDirectory 未加载完成或为空时，禁止创建项目（按钮置灰 + loading 态）
const canCreateProject = computed(() => !homeDirectoryLoading.value && !!homeDirectory.value)

async function handleSubmit(e: Event) {
  e.preventDefault()
  // [新增] 前置守卫：homeDirectory 未就绪时阻止提交，防止空路径引发错误
  if (!canCreateProject.value) return
  await formRef.value?.validate()
  await currentProject.value?.onSubmit?.(currentProject as Ref<ProjectConfiguration>)
}

const handleChange = () => formRef.value?.validate()

function callItemOnClick(item: import('../../composables/project-configuration').TextButtonGroupInput, project: Ref<ProjectConfiguration | undefined> | ProjectConfiguration | undefined) {
  item.onClick?.(project)
}
</script>

<template>
  <div>
    <Heading :title="$t('project.createProject.title')">
      <NButton type="info" @click="$router.push('/project/template-market')">
        <NIcon mr-1>
          <div i-ph-storefront-duotone />
        </NIcon>
        {{ $t('project.templateMarket.title') }}
      </NButton>
      <!-- [新增] 创建按钮在 homeDirectory 加载期间显示 loading 状态且禁用，防止用户在数据未就绪时提交 -->
      <NButton type="primary" :disabled="!canCreateProject" :loading="homeDirectoryLoading" @click="handleSubmit">
        <NIcon mr-1>
          <div i-ph-plus-circle-duotone />
        </NIcon>
        {{ $t('project.createProject.submit') }}
      </NButton>
    </Heading>

    <div flex="~ gap-4 col sm:row justify-between">
      <div class="w-full md:w-2/5">
        <h2 class="text-lg font-bold mb-2">
          {{ $t('project.createProject.application') }}
        </h2>
        <ul v-for="(item, index) in projectConfigurations" :key="index">
          <li :key="index">
            <ProjectChoice
              :title="item.title"
              :description="item.description"
              :icon="item.icon"
              :selected="item.id === currentProjectId"
            />
          </li>
        </ul>
      </div>
      <div class="w-full md:w-3/5">
        <NForm ref="formRef" flex="~ col gap-1" :model="currentProject?.input ?? {}" :rules="currentProject?.rules" @submit="handleSubmit">
          <NFormItem v-for="(item, name) in (currentProject?.input ?? {})" :key="name" flex="~ col gap-0.5" :path="name.toString()">
            <template #label>
              <div flex="~ gap-1 items-center">
                <div v-if="item.labelIcon" :class="item.labelIcon" />
                {{ item.label }}
              </div>
            </template>
            <NInput v-if="item.type === 'text'" v-model:value="item.value" :placeholder="item.placeholder" :required="item.required" @update:value="handleChange" />
            <NSelect v-else-if="item.type === 'select'" v-model:value="item.value" :options="item.options" :required="item.required" @update:value="handleChange" />
            <NCheckboxGroup v-else-if="item.type === 'checkbox'" v-model:value="item.value" :required="item.required" @update:value="handleChange">
              <NCheckbox v-for="(option, jndex) in item.options" :key="jndex" :value="option.value" :label="option.label" />
            </NCheckboxGroup>
            <NInputGroup v-else-if="item.type === 'text-button-group'">
              <NInput v-model:value="item.value" :placeholder="item.placeholder" :required="item.required" @update:value="handleChange" />
              <NButton type="primary" @click="callItemOnClick(item, currentProject)">
                <span v-if="Array.isArray(item.buttonContent)" flex="~ gap-1 items-center">
                  <NIcon><div :class="item.buttonContent[1].icon" /></NIcon>
                  <span>{{ item.buttonContent[0].text }}</span>
                </span>
                <span v-else>
                  <NIcon v-if="item.buttonContent.type === 'icon'" mr-1><div :class="item.buttonContent.icon" /></NIcon>
                  <span v-if="item.buttonContent.type === 'text'">{{ item.buttonContent.text }}</span>
                </span>
              </NButton>
            </NInputGroup>
          </NFormItem>
        </NForm>
      </div>
    </div>
  </div>
</template>
