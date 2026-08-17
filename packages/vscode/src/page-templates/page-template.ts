export enum PageTemplateId {
  BlankV1 = 'blank-v1',
  BlankV2 = 'blank-v2',
  NavV1 = 'nav-v1',
  NavV2 = 'nav-v2',
  NavDestinationV1 = 'nd-v1',
  NavDestinationV2 = 'nd-v2',
}

export type PageRegisterTarget = 'main_pages' | 'route_map' | 'none'

export interface CustomPageTemplate {
  id: string
  label: string
  description?: string
  source: string
  register?: PageRegisterTarget
}

export interface PageTemplateDefinition {
  id: string
  labelKey?: string
  descriptionKey?: string
  label?: string
  description?: string
  register: PageRegisterTarget
  builtin: boolean
  source?: string
}

const BUILTIN_PAGE_TEMPLATES: readonly PageTemplateDefinition[] = [
  {
    id: PageTemplateId.BlankV1,
    labelKey: 'page.createPage.template.blankV1',
    descriptionKey: 'page.createPage.template.blankV1.description',
    register: 'main_pages',
    builtin: true,
  },
  {
    id: PageTemplateId.BlankV2,
    labelKey: 'page.createPage.template.blankV2',
    descriptionKey: 'page.createPage.template.blankV2.description',
    register: 'main_pages',
    builtin: true,
  },
  {
    id: PageTemplateId.NavV1,
    labelKey: 'page.createPage.template.navV1',
    descriptionKey: 'page.createPage.template.navV1.description',
    register: 'main_pages',
    builtin: true,
  },
  {
    id: PageTemplateId.NavV2,
    labelKey: 'page.createPage.template.navV2',
    descriptionKey: 'page.createPage.template.navV2.description',
    register: 'main_pages',
    builtin: true,
  },
  {
    id: PageTemplateId.NavDestinationV1,
    labelKey: 'page.createPage.template.ndV1',
    descriptionKey: 'page.createPage.template.ndV1.description',
    register: 'route_map',
    builtin: true,
  },
  {
    id: PageTemplateId.NavDestinationV2,
    labelKey: 'page.createPage.template.ndV2',
    descriptionKey: 'page.createPage.template.ndV2.description',
    register: 'route_map',
    builtin: true,
  },
]

export const PAGE_TEMPLATE_IDS = Object.values(PageTemplateId)

export function getBuiltinPageTemplates(): readonly PageTemplateDefinition[] {
  return BUILTIN_PAGE_TEMPLATES
}

export function getPageTemplates(customTemplates: readonly CustomPageTemplate[] = []): PageTemplateDefinition[] {
  const custom = customTemplates
    .filter(template => typeof template?.id === 'string' && template.id.trim() && typeof template.source === 'string')
    .map<PageTemplateDefinition>(template => ({
      id: template.id.trim(),
      label: template.label?.trim() || template.id.trim(),
      description: template.description?.trim(),
      register: template.register ?? 'none',
      builtin: false,
      source: template.source,
    }))

  const customIds = new Set(custom.map(template => template.id))
  return [
    ...BUILTIN_PAGE_TEMPLATES.filter(template => !customIds.has(template.id)),
    ...custom,
  ]
}

export function findPageTemplate(id: string, customTemplates: readonly CustomPageTemplate[] = []): PageTemplateDefinition | undefined {
  return getPageTemplates(customTemplates).find(template => template.id === id)
}

const PAGE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

export function normalizePageName(input: string): string {
  const trimmed = input.trim().replace(/\\/g, '/').replace(/\.ets$/i, '')
  const segments = trimmed.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? ''
}

export function validatePageName(input: string): string | undefined {
  const pageName = normalizePageName(input)
  if (!pageName) return 'empty'
  if (!PAGE_NAME_PATTERN.test(pageName)) return 'invalid'
  return undefined
}

function renderBlankPage(pageName: string, version: 1 | 2): string {
  const header = version === 1 ? '@Entry\n@Component' : '@Entry\n@ComponentV2'
  const stateDecorator = version === 1 ? '@State' : '@Local'
  return `${header}
struct ${pageName} {
  ${stateDecorator} message: string = 'Hello World';

  build() {
    RelativeContainer() {
      Text(this.message)
        .id('HelloWorld')
        .fontSize(50)
        .fontWeight(FontWeight.Bold)
        .alignRules({
          center: { anchor: '__container__', align: VerticalAlign.Center },
          middle: { anchor: '__container__', align: HorizontalAlign.Center }
        })
        .onClick(() => {
          this.message = 'Welcome';
        })
    }
    .height('100%')
    .width('100%')
  }
}
`
}

function renderNavPage(pageName: string, version: 1 | 2): string {
  const header = version === 1 ? '@Entry\n@Component' : '@Entry\n@ComponentV2'
  return `${header}
struct ${pageName} {
  build() {
    Navigation() {
      Column() {
        Text('${pageName}')
          .fontSize(20)
      }
      .width('100%')
      .height('100%')
    }
    .title('${pageName}')
    .mode(NavigationMode.Auto)
  }
}
`
}

function renderNavDestinationPage(pageName: string, version: 1 | 2): string {
  const component = version === 1 ? '@Component' : '@ComponentV2'
  return `@Builder
export function ${pageName}Builder() {
  ${pageName}()
}

${component}
export struct ${pageName} {
  build() {
    NavDestination() {
      Column() {
        Text('${pageName}')
          .fontSize(20)
      }
      .width('100%')
      .height('100%')
    }
    .title('${pageName}')
  }
}
`
}

function renderCustomPage(source: string, pageName: string): string {
  return source
    .replaceAll('{{pageName}}', pageName)
    .replaceAll('{{name}}', pageName)
}

export function renderPageTemplate(template: PageTemplateDefinition, pageName: string): string {
  const name = normalizePageName(pageName)
  if (template.source) return renderCustomPage(template.source, name)

  switch (template.id) {
    case PageTemplateId.BlankV1:
      return renderBlankPage(name, 1)
    case PageTemplateId.BlankV2:
      return renderBlankPage(name, 2)
    case PageTemplateId.NavV1:
      return renderNavPage(name, 1)
    case PageTemplateId.NavV2:
      return renderNavPage(name, 2)
    case PageTemplateId.NavDestinationV1:
      return renderNavDestinationPage(name, 1)
    case PageTemplateId.NavDestinationV2:
      return renderNavDestinationPage(name, 2)
    default:
      return renderBlankPage(name, 1)
  }
}
