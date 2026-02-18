export function onDidRefresh(callback: () => void, { immediate = false }: { immediate?: boolean } = { immediate: false }): void {
  onDidRefresh.callbacks.add(callback)
  if (immediate) callback()
}

export namespace onDidRefresh {
  export const callbacks = new Set<() => void>()
}
