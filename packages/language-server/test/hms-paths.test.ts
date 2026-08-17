import { describe, expect, it } from 'vite-plus/test'
import { addHmsPathMapping, hmsDeclarationToModuleNames, hmsEtsWildcardTargets, stripDeclarationExtension } from '../src/utils/hms-paths'

describe('hms kit export path mapping', () => {
  it('strips .d.ts and .d.ets extensions', () => {
    expect(stripDeclarationExtension('@kit.UIDesignKit.d.ts')).toBe('@kit.UIDesignKit')
    expect(stripDeclarationExtension('@hms.core.uidesign.titleBar.d.ets')).toBe('@hms.core.uidesign.titleBar')
    expect(stripDeclarationExtension('nested\\titleBar.d.ts')).toBe('nested/titleBar')
  })

  it('maps a top-level kit barrel to its module name', () => {
    expect(hmsDeclarationToModuleNames('@kit.UIDesignKit.d.ts')).toEqual(['@kit.UIDesignKit'])
  })

  it('maps nested HMS api files to both slash and dotted specifiers', () => {
    expect(hmsDeclarationToModuleNames('@hms.core.uidesign/titleBar.d.ts')).toEqual([
      '@hms.core.uidesign/titleBar',
      '@hms.core.uidesign.titleBar',
    ])
    expect(hmsDeclarationToModuleNames('@hms.core.uidesign/HdsNavigation.d.ets')).toEqual([
      '@hms.core.uidesign/HdsNavigation',
      '@hms.core.uidesign.HdsNavigation',
    ])
  })

  it('ignores non-declaration files', () => {
    expect(hmsDeclarationToModuleNames('readme.md')).toEqual([])
  })

  it('records file and wildcard targets for kit re-exports', () => {
    const paths: Record<string, string[]> = {}
    addHmsPathMapping(
      paths,
      '@hms.core.uidesign.titleBar',
      '/hms/ets/api/@hms.core.uidesign/titleBar.d.ts',
      '/hms/ets/api/@hms.core.uidesign/titleBar/*',
    )
    expect(paths['@hms.core.uidesign.titleBar']).toEqual([
      '/hms/ets/api/@hms.core.uidesign/titleBar.d.ts',
    ])
    expect(paths['@hms.core.uidesign.titleBar/*']).toEqual([
      '/hms/ets/api/@hms.core.uidesign/titleBar/*',
    ])
  })

  it('adds HMS api/kits/arkts wildcards so kit re-exports resolve like OpenHarmony', () => {
    expect(hmsEtsWildcardTargets('/sdk/hms/ets')).toEqual([
      '/sdk/hms/ets/api/*',
      '/sdk/hms/ets/kits/*',
      '/sdk/hms/ets/arkts/*',
    ])
  })
})
