export function onDidChangeActiveColorTheme(callback: () => void): void {
  onDidChangeActiveColorTheme.callbacks.add(callback)
}

export namespace onDidChangeActiveColorTheme {
  export const callbacks = new Set<() => void>()
}
