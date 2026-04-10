<script setup lang="tsx">
const { currentProgressSeconds, progressPercentage, loopInterval, pause, resume, isActive, execute } = useHdcLoop()
</script>

<template>
  <div class="flex items-center gap-2">
    <NTooltip>
      <template #trigger>
        <NButton size="tiny" type="primary" text circle @click="isActive ? pause() : resume()">
          <template #icon>
            <div :class="isActive ? 'i-ph-pause-duotone' : 'i-ph-play-duotone'" />
          </template>
        </NButton>
      </template>
      {{ isActive ? '暂停' : '开始' }}
    </NTooltip>
    <NPopover :show-arrow="false">
      <template #trigger>
        <NProgress :percentage="progressPercentage" type="circle" class="w-4! text-2! select-none cursor-pointer" @click="execute">
          {{ currentProgressSeconds.toFixed() }}
        </NProgress>
      </template>
      <div class="flex flex-col gap-2">
        <div>Loop Progress: {{ currentProgressSeconds.toFixed(1) }}s</div>
        <div class="flex items-center gap-2">
          <div>Interval: </div>
          <NInputNumber
            v-model:value="loopInterval" size="tiny" :min="100" :step="100"
            :theme-overrides="{ peers: { Input: { border: 'var(--vscode-inputOption-activeBorder)', color: 'var(--vscode-inputOption-activeBackground)' } } }"
          />
        </div>
      </div>
      <div class="text-2.5 op-80 mt-2 text-right">点击立即刷新</div>
    </NPopover>
  </div>
</template>
