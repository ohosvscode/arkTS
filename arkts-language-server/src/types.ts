import type { createServer as createBrowserServer } from '@volar/language-server/browser'
import type { createServer as createNodeServer } from '@volar/language-server/node'

export type VolarServer = ReturnType<typeof createNodeServer> | ReturnType<typeof createBrowserServer>
