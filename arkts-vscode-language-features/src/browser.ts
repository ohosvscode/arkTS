import type { Extension } from './common/entry-exporter'
import type { UserModule } from './types'
import { createExtension } from './common/entry-exporter'

// eslint-disable-next-line ts/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line no-restricted-syntax
export = createExtension(import.meta.glob<{ default?: UserModule }>(['./browser/*.ts', './common/*.ts'], { eager: true })) as Extension
