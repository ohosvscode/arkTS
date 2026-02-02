import type { UserModule } from '../types'
import { createI18n } from 'vue-i18n'

export const install: UserModule = async ({ app }, connection) => {
  const currentLanguage = await connection?.getCurrentLanguage?.() ?? 'en'
  const i18n = createI18n({
    legacy: false,
    // `C` is mean `Current`, we only need to use it, not to change it.
    // The language change will be handled by the VS Code extension,
    // we just need to follow the vscode itself.
    locale: 'C',
    flatJson: true,
    messages: {
      C: (await connection?.findAllL10nByCurrentLanguage?.()) ?? (await loadFromFileSystem()),
    },
  })
  app.provide('vscode:currentLanguage', currentLanguage)
  app.provide('naiveui:locale', await loadCurrentNaiveUILocale(currentLanguage))
  app.use(i18n)
}

async function loadFromFileSystem(): Promise<Record<string, string>> {
  try {
    const PATH_IDENTIFIER = 'node:path'
    const fs = await import('node:fs')
    const path = await import(PATH_IDENTIFIER)
    const process = await import('node:process')

    const content = fs.readFileSync(path.join(process.cwd(), 'package.nls.json'), 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return {}
  }
}

async function loadCurrentNaiveUILocale(language: string): Promise<object | undefined> {
  switch (language.toLowerCase()) {
    case 'az-az': return await import('naive-ui/es/locales/common/azAZ').then(module => module.default)
    case 'ar-dz': return await import('naive-ui/es/locales/common/arDZ').then(module => module.default)
    case 'cs-cz': return await import('naive-ui/es/locales/common/csCZ').then(module => module.default)
    case 'da-dk': return await import('naive-ui/es/locales/common/daDK').then(module => module.default)
    case 'de-de': return await import('naive-ui/es/locales/common/deDE').then(module => module.default)
    case 'en-GB': return await import('naive-ui/es/locales/common/enGB').then(module => module.default)
    case 'en-us': return await import('naive-ui/es/locales/common/enUS').then(module => module.default)
    case 'eo': return await import('naive-ui/es/locales/common/eo').then(module => module.default)
    case 'es-ar': return await import('naive-ui/es/locales/common/esAR').then(module => module.default)
    case 'et-ee': return await import('naive-ui/es/locales/common/etEE').then(module => module.default)
    case 'fa-IR': return await import('naive-ui/es/locales/common/faIR').then(module => module.default)
    case 'id-id': return await import('naive-ui/es/locales/common/idID').then(module => module.default)
    case 'it-it': return await import('naive-ui/es/locales/common/itIT').then(module => module.default)
    case 'ja-jp': return await import('naive-ui/es/locales/common/jaJP').then(module => module.default)
    case 'km-kh': return await import('naive-ui/es/locales/common/kmKH').then(module => module.default)
    case 'ko-kr': return await import('naive-ui/es/locales/common/koKR').then(module => module.default)
    case 'nb-no': return await import('naive-ui/es/locales/common/nbNO').then(module => module.default)
    case 'nl-nl': return await import('naive-ui/es/locales/common/nlNL').then(module => module.default)
    case 'pl-pl': return await import('naive-ui/es/locales/common/plPL').then(module => module.default)
    case 'pt-br': return await import('naive-ui/es/locales/common/ptBR').then(module => module.default)
    case 'ru-ru': return await import('naive-ui/es/locales/common/ruRU').then(module => module.default)
    case 'sk-sk': return await import('naive-ui/es/locales/common/skSK').then(module => module.default)
    case 'sv-se': return await import('naive-ui/es/locales/common/svSE').then(module => module.default)
    case 'th-th': return await import('naive-ui/es/locales/common/thTH').then(module => module.default)
    case 'tr-tr': return await import('naive-ui/es/locales/common/trTR').then(module => module.default)
    case 'ug-cn': return await import('naive-ui/es/locales/common/ugCN').then(module => module.default)
    case 'uk-ua': return await import('naive-ui/es/locales/common/ukUA').then(module => module.default)
    case 'uz-uz': return await import('naive-ui/es/locales/common/uzUZ').then(module => module.default)
    case 'vi-vn': return await import('naive-ui/es/locales/common/viVN').then(module => module.default)
    case 'zh-cn': return await import('naive-ui/es/locales/common/zhCN').then(module => module.default)
    case 'zh-tw': return await import('naive-ui/es/locales/common/zhTW').then(module => module.default)
    default: return undefined
  }
}
