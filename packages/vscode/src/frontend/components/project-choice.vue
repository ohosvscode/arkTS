<script setup lang="ts">
defineProps<{
  title: string
  description: string
  icon?: string
  selected?: boolean
}>()
const container = ref<HTMLElement | null>(null)
const { tilt, roll } = useParallax(container)
const { pressed } = useMousePressed({ target: container })
const maxTilt = 9 // 最大倾斜角度

const transform = computed(() => {
  if (!pressed.value) return ''
  // tilt 控制左右倾斜（rotateY），roll 控制前后倾斜（rotateX）
  // 调整符号和角度，使倾斜方向更自然
  const tiltY = tilt.value * maxTilt // 左右倾斜
  const tiltX = roll.value * maxTilt // 前后倾斜
  const scale = 0.97 // 按下时的缩放
  return `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${scale})`
})
</script>

<template>
  <div
    ref="container" :style="{ transform }" flex="~ gap-2 items-center"
    :class="`px-4 py-3 rounded-2px cursor-pointer transition-all duration-200 ${selected ? 'bg-[var(--vscode-inputOption-hoverBackground)]' : ''}`"
    border="~ color-[var(--vscode-input-background)] hover:color-[var(--vscode-inputOption-hoverBackground)] solid 1"
  >
    <div v-if="icon" :class="icon" text="3xl" />
    <div flex="~ col gap-0.5">
      <h2 class="text-sm font-bold">
        {{ title }}
      </h2>
      <p class="text-sm text-gray-500">
        {{ description }}
      </p>
    </div>
  </div>
</template>
