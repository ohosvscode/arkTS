export * from './client-options'
export * from './language-server-config'
export * from './log/lsp-logger'
export * from './sys-resource'
export * from './text-document'
export * from './ts-plugin-options'

export function typeAssert<T>(_value: unknown): asserts _value is T {}
