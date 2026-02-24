import type { Ref } from 'vue'

export interface UseLoadingFnReturn<T, A extends unknown[]> {
  loading: Ref<boolean>
  execute(...args: A): Promise<T>
  handle: this
}

export interface UseLoadingFnFunctionOptions<R, A extends unknown[]> {
  (...args: A): Promise<R>
}

export interface UseLoadingFnObjectOptions<R, A extends unknown[]> {
  execute: UseLoadingFnFunctionOptions<R, A>
  immediate?: A | false
}

export type UseLoadingFnOptions<R, A extends unknown[]> = UseLoadingFnFunctionOptions<R, A> | UseLoadingFnObjectOptions<R, A>

export function useLoadingFn<R, A extends unknown[]>(fn: UseLoadingFnObjectOptions<R, A>): UseLoadingFnReturn<R, A>
export function useLoadingFn<R, A extends unknown[]>(fn: UseLoadingFnFunctionOptions<R, A>, immediate?: A | false): UseLoadingFnReturn<R, A>
export function useLoadingFn<R, A extends unknown[]>(fn: UseLoadingFnOptions<R, A>, immediate: false | A = false): UseLoadingFnReturn<R, A> {
  const loading = ref(false)

  async function execute(...args: A): Promise<R> {
    if (typeof fn === 'function') {
      try {
        loading.value = true
        return await fn(...args)
      }
      finally {
        loading.value = false
      }
    }
    else {
      try {
        loading.value = true
        return await fn.execute(...args)
      }
      finally {
        loading.value = false
      }
    }
  }

  if (typeof fn === 'function' && immediate) execute(...immediate)
  else if (typeof fn === 'object' && fn.immediate) execute(...fn.immediate)

  const res = {
    loading,
    execute,
  } as UseLoadingFnReturn<R, A>

  res.handle = res

  return res
}
