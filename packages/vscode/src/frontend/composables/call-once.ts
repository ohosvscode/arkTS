import type { AnyFn } from '@vueuse/core'

export function useCallOnce(fn: AnyFn) {
  let isCalled = false

  return async () => {
    if (isCalled) return
    isCalled = true
    await fn()
  }
}
