import type { CompatibleDisposable, EventListener } from '@vstils/core'
import type { Pausable } from '@vueuse/core'
import type { DeepReadonly, Ref } from 'vue'
import { Disposable } from '@vstils/core'

const PROGRESS_TICK_MS = 100
const loopInterval = ref(5000)
const callbacks = new Set<EventListener<void>>()
const executing = ref(false)
const progressPercentage = ref(0)
const currentProgressSeconds = ref(0)

let cycleStartMs = Date.now()

function effectiveIntervalMs(): number {
  return Math.max(1, loopInterval.value)
}

function resetProgressCycle(): void {
  cycleStartMs = Date.now()
  progressPercentage.value = 0
  currentProgressSeconds.value = 0
}

async function executeLoopCycle(): Promise<void> {
  if (executing.value) return
  executing.value = true
  progressPercentage.value = 100
  currentProgressSeconds.value = effectiveIntervalMs() / 1000
  try {
    await Promise.allSettled(Array.from(callbacks).map(callback => callback()))
  }
  finally {
    executing.value = false
    resetProgressCycle()
  }
}

function onTick(): void {
  if (executing.value) return
  const elapsed = Date.now() - cycleStartMs
  const intervalMs = effectiveIntervalMs()
  const capped = Math.min(elapsed, intervalMs)
  progressPercentage.value = (capped / intervalMs) * 100
  currentProgressSeconds.value = capped / 1000
  if (elapsed >= intervalMs) void executeLoopCycle()
}

const { pause, resume, isActive } = useIntervalFn(onTick, PROGRESS_TICK_MS, { immediate: true })

watch(loopInterval, () => {
  if (executing.value) return
  onTick()
})

export interface HdcLoop extends Pausable {
  onLoop(callback: EventListener<void>, immediate?: boolean): CompatibleDisposable
  readonly isExecuting: DeepReadonly<Ref<boolean>>
  readonly progressPercentage: DeepReadonly<Ref<number>>
  readonly currentProgressSeconds: DeepReadonly<Ref<number>>
  readonly loopInterval: Ref<number>
}

export function useHdcLoop(): HdcLoop {
  return {
    pause,
    resume,
    isActive,
    onLoop: (callback: EventListener<void>, immediate = false): CompatibleDisposable => {
      callbacks.add(callback)
      if (immediate && !import.meta.env.SSR) void callback()
      return Disposable.fn(() => callbacks.delete(callback))
    },
    isExecuting: readonly(executing),
    progressPercentage: readonly(progressPercentage),
    currentProgressSeconds: readonly(currentProgressSeconds),
    loopInterval,
  }
}
