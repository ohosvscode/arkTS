<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    list: any[]
    columnWidth?: number // 列宽
    columnGap?: number // 列间距
  }>(),
  {
    columnWidth: 240,
    columnGap: 10,
  },
)

const wrapper = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
// waterfall flow 瀑布流列高 [0,0,0,...]
const flowHeight: number[] = []

/// 绘制瀑布流
function flowDraw() {
  if (!content.value) return
  // 初始化列高
  const columnCount = getColumnCount()
  flowHeight.length = columnCount
  for (let i = 0; i < columnCount; i++) {
    flowHeight[i] = 0
  }
  // 设置容器宽（居中布局）
  const itemW = props.columnWidth + props.columnGap
  content.value.style.width = `${itemW * columnCount - props.columnGap}px`

  // 绘制 item 位置
  const doms = content.value.querySelectorAll('.WaterfallItem')
  doms.forEach((dom: any) => {
    const minIdx = getMinIndex(flowHeight)
    dom.style.left = `${minIdx * itemW}px`
    dom.style.top = `${flowHeight[minIdx]}px`
    flowHeight[minIdx] += dom.offsetHeight
  })
  // 设置容器高
  content.value.style.height = `${Math.max(...flowHeight)}px`
}

/// 获取列的数量
function getColumnCount(): number {
  if (!wrapper.value) return 0
  const itemW = props.columnWidth + props.columnGap
  const num = (wrapper.value.offsetWidth + props.columnGap) / itemW
  return Math.min(Math.floor(num), props.list.length)
}

/// 获取最小值的索引 index
function getMinIndex(list: number[]) {
  const min = Math.min(...list)
  return list.indexOf(min)
}

/// 监听窗口变化重绘瀑布流布局
let timer: ReturnType<typeof setTimeout> | null = null
function onResize() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  timer = setTimeout(() => {
    flowDraw()
  }, 300)
}

onMounted(() => {
  flowDraw()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div ref="wrapper" class="WaterfallList">
    <div ref="content" class="WaterfallContent">
      <div v-for="(item, index) in list" :key="index" class="WaterfallItem">
        <slot name="item" :index="index" :item="item" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.WaterfallContent {
  margin-left: auto;
  margin-right: auto;
  position: relative;
}

.WaterfallItem {
  padding-bottom: 24px;
  width: v-bind("`${columnWidth}px`");
  position: absolute;
  top: 0;
  left: 0;
}
</style>
