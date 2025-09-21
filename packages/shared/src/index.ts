export * from './client-options'
export * from './log/lsp-logger'
export * from './project-detector'
export * from './resource-resolver'
export * from './ts-plugin-options'

export function typeAssert<T>(_value: unknown): asserts _value is T {}
