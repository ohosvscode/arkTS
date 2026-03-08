import type { ETSMacroPlugin, ETSVirtualCode } from './ets-code'
import { replaceRange } from 'ts-macro'

export function $$thisFixerPlugin(): ETSMacroPlugin {
  const $$thisRegex = /\$\$this/g

  return {
    name: 'ets:$$this-fixer',
    resolveVirtualCode(virtualCode: ETSVirtualCode) {
      const text = virtualCode.ast.getText()
      const matches = text.matchAll($$thisRegex)
      for (const match of matches) {
        const start = match.index ?? 0
        const end = start + match[0].length
        replaceRange(virtualCode.codes, start, end, [
          'this',
          match[0],
          start + 2,
          {
            completion: true,
            format: true,
            navigation: true,
            semantic: true,
            structure: true,
            verification: true,
          },
        ])
      }
    },
  }
}
