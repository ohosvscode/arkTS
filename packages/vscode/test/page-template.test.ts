import path from 'node:path'
import JSON5 from 'json5'
import { describe, expect, it } from 'vite-plus/test'
import {
  appendMainPages,
  appendRouteMap,
  ensureModuleProfileField,
  findModuleJson5Path,
  findPageTemplate,
  getBuiltinPageTemplates,
  getModuleRoot,
  getPageRoutePath,
  getPageSourceFile,
  getPageTemplates,
  normalizePageName,
  PAGE_TEMPLATE_IDS,
  PageTemplateId,
  planCreatePage,
  renderPageTemplate,
  resolveProfileFilePath,
  resolveProfileRef,
  validatePageName,
} from '../src/page-templates'

function virtualFs(files: Record<string, string>) {
  const store = new Map(Object.entries(files).map(([filePath, content]) => [path.resolve(filePath), content]))
  return {
    exists: (filePath: string) => store.has(path.resolve(filePath)),
    readFile: (filePath: string) => store.get(path.resolve(filePath)),
  }
}

describe('page templates', () => {
  it('exposes the built-in create-page template enum', () => {
    expect(PAGE_TEMPLATE_IDS).toEqual([
      PageTemplateId.BlankV1,
      PageTemplateId.BlankV2,
      PageTemplateId.NavV1,
      PageTemplateId.NavV2,
      PageTemplateId.NavDestinationV1,
      PageTemplateId.NavDestinationV2,
    ])
    expect(getBuiltinPageTemplates().map(template => template.id)).toEqual(PAGE_TEMPLATE_IDS)
    expect(findPageTemplate(PageTemplateId.BlankV1)?.register).toBe('main_pages')
    expect(findPageTemplate(PageTemplateId.NavDestinationV2)?.register).toBe('route_map')
  })

  it('merges custom templates and lets them override a built-in id', () => {
    const templates = getPageTemplates([
      {
        id: PageTemplateId.BlankV1,
        label: 'My blank',
        source: 'struct {{pageName}} {}',
        register: 'none',
      },
      {
        id: 'login',
        label: 'Login',
        description: 'Login form',
        source: '@Entry\n@Component\nstruct {{pageName}} {}',
        register: 'main_pages',
      },
    ])

    expect(templates.map(template => template.id)).toEqual([
      PageTemplateId.BlankV2,
      PageTemplateId.NavV1,
      PageTemplateId.NavV2,
      PageTemplateId.NavDestinationV1,
      PageTemplateId.NavDestinationV2,
      PageTemplateId.BlankV1,
      'login',
    ])
    expect(findPageTemplate('login', [{ id: 'login', label: 'Login', source: 'x' }])?.register).toBe('none')
  })

  it('normalizes and validates page names', () => {
    expect(normalizePageName(' pages/SecondPage.ets ')).toBe('SecondPage')
    expect(validatePageName('SecondPage')).toBeUndefined()
    expect(validatePageName('')).toBe('empty')
    expect(validatePageName('2page')).toBe('invalid')
    expect(validatePageName('second-page')).toBe('invalid')
  })

  it('renders v1/v2 blank, navigation, and nav-destination pages', () => {
    const blankV1 = renderPageTemplate(findPageTemplate(PageTemplateId.BlankV1)!, 'Home')
    const blankV2 = renderPageTemplate(findPageTemplate(PageTemplateId.BlankV2)!, 'Home')
    const navV1 = renderPageTemplate(findPageTemplate(PageTemplateId.NavV1)!, 'RootNav')
    const ndV2 = renderPageTemplate(findPageTemplate(PageTemplateId.NavDestinationV2)!, 'Detail')

    expect(blankV1).toContain('@Entry')
    expect(blankV1).toContain('@Component')
    expect(blankV1).toContain('@State message')
    expect(blankV1).toContain('struct Home')
    expect(blankV1).not.toContain('@ComponentV2')

    expect(blankV2).toContain('@ComponentV2')
    expect(blankV2).toContain('@Local message')
    expect(blankV2).not.toContain('@State message')

    expect(navV1).toContain('Navigation()')
    expect(navV1).toContain(".title('RootNav')")

    expect(ndV2).toContain('export function DetailBuilder()')
    expect(ndV2).toContain('@ComponentV2')
    expect(ndV2).toContain('NavDestination()')
    expect(ndV2).not.toContain('@Entry')
  })

  it('renders custom templates with {{pageName}}', () => {
    const source = renderPageTemplate({
      id: 'login',
      builtin: false,
      register: 'none',
      source: 'struct {{pageName}} { title: string = "{{name}}" }',
    }, 'LoginPage')
    expect(source).toBe('struct LoginPage { title: string = "LoginPage" }')
  })
})

describe('page registration', () => {
  it('appends unique routes to main_pages.json', () => {
    const first = appendMainPages('{\n  "src": [\n    "pages/Index"\n  ]\n}\n', 'pages/Second')
    expect(JSON.parse(first)).toEqual({ src: ['pages/Index', 'pages/Second'] })
    expect(appendMainPages(first, 'pages/Second')).toBe(first)
  })

  it('appends unique routerMap entries and honors a custom profile name', () => {
    expect(resolveProfileRef('$profile:my_routes', 'route_map')).toBe('my_routes')
    expect(resolveProfileRef(undefined, 'route_map')).toBe('route_map')

    const first = appendRouteMap(undefined, {
      name: 'Detail',
      pageSourceFile: 'src/main/ets/pages/Detail.ets',
      buildFunction: 'DetailBuilder',
    })
    expect(JSON.parse(first)).toEqual({
      routerMap: [
        {
          name: 'Detail',
          pageSourceFile: 'src/main/ets/pages/Detail.ets',
          buildFunction: 'DetailBuilder',
        },
      ],
    })
    expect(appendRouteMap(first, {
      name: 'Detail',
      pageSourceFile: 'src/main/ets/pages/Other.ets',
      buildFunction: 'OtherBuilder',
    })).toBe(first)
  })

  it('finds module.json5 and derives route paths from the module root', () => {
    const moduleJson5 = '/tmp/demo/entry/src/main/module.json5'
    const access = virtualFs({ [moduleJson5]: '{ module: {} }' })
    expect(findModuleJson5Path('/tmp/demo/entry/src/main/ets/pages', access.exists)).toBe(path.resolve(moduleJson5))
    expect(getModuleRoot(moduleJson5)).toBe(path.normalize('/tmp/demo/entry'))
    expect(getPageRoutePath('/tmp/demo/entry/src/main/ets/pages/Second.ets', '/tmp/demo/entry')).toBe('pages/Second')
    expect(getPageSourceFile('/tmp/demo/entry/src/main/ets/pages/Second.ets', '/tmp/demo/entry')).toBe('src/main/ets/pages/Second.ets')
    expect(resolveProfileFilePath('/tmp/demo/entry', 'route_map', () => false)).toBe(
      path.join('/tmp/demo/entry', 'src', 'main', 'resources', 'base', 'profile', 'route_map.json'),
    )
  })

  it('adds missing pages/routerMap fields on module.json5', () => {
    const created = ensureModuleProfileField('{ module: { name: "entry" } }', 'routerMap', '$profile:route_map')
    expect(created.changed).toBe(true)
    expect(JSON5.parse(created.content)).toEqual({
      module: {
        name: 'entry',
        routerMap: '$profile:route_map',
      },
    })

    const unchanged = ensureModuleProfileField(created.content, 'routerMap', '$profile:other')
    expect(unchanged.changed).toBe(false)
  })

  it('plans a blank page that registers in main_pages.json', () => {
    const moduleJson5 = '/tmp/app/entry/src/main/module.json5'
    const mainPages = '/tmp/app/entry/src/main/resources/base/profile/main_pages.json'
    const access = virtualFs({
      [moduleJson5]: '{ module: { pages: "$profile:main_pages" } }',
      [mainPages]: '{ "src": ["pages/Index"] }',
    })

    const plan = planCreatePage(
      findPageTemplate(PageTemplateId.BlankV2)!,
      'Second',
      '/tmp/app/entry/src/main/ets/pages',
      true,
      access,
    )

    expect(plan.pageFile.filePath).toBe(path.join('/tmp/app/entry/src/main/ets/pages', 'Second.ets'))
    expect(plan.pageFile.content).toContain('@ComponentV2')
    expect(plan.registerTarget).toBe('main_pages')
    expect(plan.extraFiles).toHaveLength(1)
    expect(plan.extraFiles[0]?.filePath).toBe(path.resolve(mainPages))
    expect(JSON.parse(plan.extraFiles[0]!.content)).toEqual({
      src: ['pages/Index', 'pages/Second'],
    })
  })

  it('plans a nav-destination page against the actual routerMap profile name', () => {
    const moduleJson5 = '/tmp/app/entry/src/main/module.json5'
    const routeMap = '/tmp/app/entry/src/main/resources/base/profile/my_routes.json'
    const access = virtualFs({
      [moduleJson5]: '{ module: { routerMap: "$profile:my_routes" } }',
      [routeMap]: '{ "routerMap": [] }',
    })

    const plan = planCreatePage(
      findPageTemplate(PageTemplateId.NavDestinationV1)!,
      'Detail',
      '/tmp/app/entry/src/main/ets/pages',
      true,
      access,
    )

    expect(plan.registerTarget).toBe('route_map')
    expect(plan.pageFile.content).toContain('DetailBuilder')
    expect(plan.extraFiles.map(file => file.filePath)).toEqual([path.resolve(routeMap)])
    expect(JSON.parse(plan.extraFiles[0]!.content)).toEqual({
      routerMap: [
        {
          name: 'Detail',
          pageSourceFile: 'src/main/ets/pages/Detail.ets',
          buildFunction: 'DetailBuilder',
        },
      ],
    })
  })

  it('skips registration when auto-register is disabled', () => {
    const plan = planCreatePage(
      findPageTemplate(PageTemplateId.BlankV1)!,
      'Second',
      '/tmp/app/entry/src/main/ets/pages',
      false,
      virtualFs({
        '/tmp/app/entry/src/main/module.json5': '{ module: { pages: "$profile:main_pages" } }',
      }),
    )
    expect(plan.registerTarget).toBe('none')
    expect(plan.extraFiles).toEqual([])
  })
})
