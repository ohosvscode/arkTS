export {
  appendMainPages,
  appendRouteMap,
  ensureModuleProfileField,
  findModuleJson5Path,
  getModuleRoot,
  getPageRoutePath,
  getPageSourceFile,
  planCreatePage,
  resolveProfileFilePath,
  resolveProfileRef,
  toPosixPath,
} from './page-registration'
export type { CreatePagePlan, FileAccess, PlannedFileWrite } from './page-registration'
export {
  findPageTemplate,
  getBuiltinPageTemplates,
  getPageTemplates,
  normalizePageName,
  PAGE_TEMPLATE_IDS,
  PageTemplateId,
  renderPageTemplate,
  validatePageName,
} from './page-template'
export type { CustomPageTemplate, PageRegisterTarget, PageTemplateDefinition } from './page-template'
