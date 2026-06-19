import type { Hover } from '@volar/language-server'

export async function patchHoverProvider(originalHover: Hover): Promise<Hover | null | undefined> {
  if (Array.isArray(originalHover.contents)) return originalHover
  if (typeof originalHover.contents !== 'object') return originalHover
  if (!('kind' in originalHover.contents)) return originalHover
  originalHover.contents.value = originalHover.contents.value.replace(/```typescript/, '```arkts')
  return originalHover
}
