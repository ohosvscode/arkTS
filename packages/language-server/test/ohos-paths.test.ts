import { describe, expect, it } from 'vite-plus/test'
import { addOhosPathMapping, ohosDeclarationToModuleNames, stripDeclarationExtension } from '../src/utils/ohos-paths'

describe('openharmony kit export path mapping', () => {
  it('strips .d.ts and .d.ets extensions', () => {
    expect(stripDeclarationExtension('@kit.AbilityKit.d.ts')).toBe('@kit.AbilityKit')
    expect(stripDeclarationExtension('@ohos.app.ability.UIAbility.d.ets')).toBe('@ohos.app.ability.UIAbility')
    expect(stripDeclarationExtension('application\\Ability.d.ts')).toBe('application/Ability')
  })

  it('maps a top-level kit barrel to its module name', () => {
    expect(ohosDeclarationToModuleNames('@kit.AbilityKit.d.ts')).toEqual(['@kit.AbilityKit'])
  })

  it('maps nested OpenHarmony api files to both slash and dotted specifiers', () => {
    expect(ohosDeclarationToModuleNames('@ohos.app.ability/UIAbility.d.ts')).toEqual([
      '@ohos.app.ability/UIAbility',
      '@ohos.app.ability.UIAbility',
    ])
    expect(ohosDeclarationToModuleNames('application/Ability.d.ets')).toEqual([
      'application/Ability',
      'application.Ability',
    ])
  })

  it('ignores non-declaration files', () => {
    expect(ohosDeclarationToModuleNames('readme.md')).toEqual([])
  })

  it('records file and wildcard targets for kit re-exports', () => {
    const paths: Record<string, string[]> = {}
    addOhosPathMapping(
      paths,
      '@kit.AbilityKit',
      '/sdk/ets/kits/@kit.AbilityKit.d.ts',
      '/sdk/ets/kits/@kit.AbilityKit/*',
    )
    expect(paths['@kit.AbilityKit']).toEqual([
      '/sdk/ets/kits/@kit.AbilityKit.d.ts',
    ])
    expect(paths['@kit.AbilityKit/*']).toEqual([
      '/sdk/ets/kits/@kit.AbilityKit/*',
    ])
  })
})
