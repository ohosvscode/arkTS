import { defineStore } from 'pinia'
import locale from '../locale.json'

interface Language {
  name: string
  iso_639_1: string
  flags: string[]
}

interface Region {
  name: string
  code: string
  flag?: string
}

export const useLocaleData = defineStore('localeData', () => {
  function getLanguages(): Language[] {
    return locale
      .filter((item, index, self) => index === self.findIndex(t => t.language.iso_639_1 === item.language.iso_639_1))
      .filter(item => item.language.iso_639_1)
      .map(item => ({
        ...item.language,
        flags: locale
          .filter(l => l.language.iso_639_1 === item.language.iso_639_1)
          .map(l => l.country.flag)
          .flat()
          .filter((item, index, self) => index === self.findIndex(t => t === item)),
      }))
  }

  function getRegions(language?: string): Region[] {
    return (language
      ? locale.filter(item => item.language.iso_639_1 === language).map(item => item.language.countries).flat()
      : locale.map(item => item.language.countries).flat())
      .filter((item, index, self) => index === self.findIndex(t => t.name === item.name))
      .map(item => ({ ...item, flag: locale.find(l => l.country.name === item.name)?.country.flag }))
  }

  return {
    getLanguages,
    getRegions,
  }
})
