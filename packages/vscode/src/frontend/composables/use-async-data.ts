import type { Ref } from 'vue'

export interface UseAsyncDataReturn<T> {
  data: Ref<T | null>
  error: Ref<Error | null>
  loading: Ref<boolean>
  execute(): Promise<void>
}

export function useAsyncData<T>(callback: () => Promise<T>, immediate: boolean = true): UseAsyncDataReturn<T> {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(false)

  async function execute(): Promise<void> {
    try {
      loading.value = true
      data.value = await callback()
    }
    catch (err) {
      data.value = null
      error.value = err as Error
      console.error(error)
    }
    finally {
      loading.value = false
    }
  }

  if (!import.meta.env.SSR && immediate) execute()

  return {
    error,
    data,
    loading,
    execute,
  } as UseAsyncDataReturn<T>
}
