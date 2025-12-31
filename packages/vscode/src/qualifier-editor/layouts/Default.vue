<script setup lang="ts">
const route = useRoute()
const { isOnline } = useNetwork()
const isBack = ref(false)
const routeHistory = ref<string[]>([route.path])
let isPopState = false

// 监听浏览器后退/前进事件
useEventListener(window, 'popstate', () => {
  isPopState = true
})

// 判断是否为后退操作：新路径在历史栈中的位置小于旧路径
function isNavigatingBack(newIndex: number, oldIndex: number): boolean {
  return newIndex !== -1 && oldIndex !== -1 && newIndex < oldIndex
}

// 更新路由历史栈
function updateRouteHistory(newPath: string, newIndex: number, isBackward: boolean) {
  if (isBackward) {
    // 后退：移除后面的历史记录
    routeHistory.value = routeHistory.value.slice(0, newIndex + 1)
  }
  else {
    // 前进：如果是新路径，添加到栈顶
    if (newIndex === -1) {
      routeHistory.value.push(newPath)
    }
    // 如果路径已在栈中但非栈顶，将其设为栈顶（清理后续记录）
    else if (newIndex < routeHistory.value.length - 1) {
      routeHistory.value = routeHistory.value.slice(0, newIndex + 1)
    }
  }
}

// 处理路由变化
watch(() => route.path, (newPath, oldPath) => {
  // 跳过初始加载
  if (!oldPath || oldPath === newPath) {
    return
  }

  const oldIndex = routeHistory.value.indexOf(oldPath)
  const newIndex = routeHistory.value.indexOf(newPath)
  const isBackward = isNavigatingBack(newIndex, oldIndex)

  // 判断导航方向并更新状态
  isBack.value = isBackward
  updateRouteHistory(newPath, newIndex, isBackward)

  // 重置 popstate 标志
  if (isPopState) {
    isPopState = false
  }
})

const transitionClasses = computed(() => {
  const baseClasses = 'transition-all duration-500 ease-out will-change-transform'
  const enterFromClass = isBack.value ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0'
  const enterToClass = 'translate-x-0 opacity-100'
  const leaveFromClass = 'translate-x-0 opacity-100'
  const leaveToClass = isBack.value ? 'translate-x-full opacity-0' : '-translate-x-full opacity-0'

  return {
    enterActiveClass: baseClasses,
    leaveActiveClass: `${baseClasses} absolute inset-0`,
    enterFromClass,
    enterToClass,
    leaveFromClass,
    leaveToClass,
  }
})

const error = ref<Error | null>(null)
const key = ref(0)
const isThrowErrorIfNoNetwork = computed(() => {
  if (route.meta.throwErrorIfNoNetwork === true && !isOnline.value) return true
  return false
})
watch(isThrowErrorIfNoNetwork, () => key.value++)

if (isThrowErrorIfNoNetwork.value) {
  onErrorCaptured((err) => {
    error.value = err
  })
}

const { width: windowWidth } = useWindowSize()
const containerTopPadding = computed(() => {
  if (windowWidth.value > 768) return 4 * 13
  else return 4 * 6
})
provide('layoutTopPadding', containerTopPadding)
</script>

<template>
  <div class="mx-1 md:mx-10 lg:mx-20 xl:mx-30 2xl:mx-60 mt-6 mb-10 md:mt-13 transition-all duration-300 relative">
    <RouterView v-slot="{ Component }">
      <template v-if="Component">
        <Transition v-bind="transitionClasses">
          <div :key="$route.path" class="w-full">
            <KeepAlive>
              <Suspense>
                <template #default>
                  <!-- Bind key to force re-render when isThrowErrorIfNoNetwork changes. -->
                  <component :is="Component" :key />
                </template>
                <template #fallback>
                  <div class="relative top-[-6rem] left-[-1rem] right-[-1rem] bottom-0 flex flex-col items-center justify-center gap-2 z-50 w-[calc(100%+2rem)] h-screen">
                    <div v-if="error" class="flex flex-col items-center justify-center gap-2 bg-[var(--vscode-editor-background)] p-4 rounded">
                      <div class="i-ph-warning-duotone font-size-10 text-[var(--vscode-errorForeground)]" />
                      <div select-none>
                        加载失败, 请提交 issue 或联系开发者修复此问题：
                      </div>
                      <a href="https://github.com/ohosvscode/arkTS/issues">
                        https://github.com/ohosvscode/arkTS/issues
                      </a>
                      <NCode class="text-sm whitespace-pre-wrap">
                        {{ error?.stack }}
                      </NCode>
                      <NButton type="primary" mt-2 @click="$router.back()">
                        {{ $t('goback') }}
                      </NButton>
                    </div>

                    <div v-else-if="isThrowErrorIfNoNetwork" class="flex flex-col items-center justify-center gap-2 bg-[var(--vscode-editor-background)] p-4 rounded">
                      <div class="i-ph-warning-duotone font-size-10 text-[var(--vscode-errorForeground)]" />
                      <div select-none>
                        {{ $t('noNetwork') }}
                      </div>
                      <NButton type="primary" mt-2 @click="$router.back()">
                        {{ $t('goback') }}
                      </NButton>
                    </div>

                    <div v-else class="flex flex-col items-center justify-center gap-2">
                      <LoadingSpinner size-full />
                    </div>
                  </div>
                </template>
              </Suspense>
            </KeepAlive>
          </div>
        </Transition>
      </template>
    </RouterView>
  </div>
</template>
