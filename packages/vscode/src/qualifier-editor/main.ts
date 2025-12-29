import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { router } from '../routers'
import Root from './Root.vue'
import 'uno.css'

async function main(): Promise<void> {
  const app = createApp(Root)
  app.use(router)
  const i18n = createI18n({
    legacy: false,
    // `C` is mean `Current`, we only need to use it, not to change it.
    // The language change will be handled by the VS Code extension,
    // we just need to follow the vscode itself.
    locale: 'C',
    flatJson: true,
    messages: {
      C: await window.connection.findAllL10nByCurrentLanguage(),
    },
  })
  app.use(i18n)
  app.use(createPinia())
  await new Promise(resolve => setTimeout(resolve, 500))
  app.mount('#app')
}

main()
