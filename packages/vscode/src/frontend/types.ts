import type { BirpcReturn } from 'birpc'
import type { ViteSSGContext } from 'vite-ssg'
import type { ProtocolContext } from '../context/protocol-context'
import type { WebviewContext } from '../context/webview-context'

export type UserModule = (
  ctx: ViteSSGContext,
  connection?: BirpcReturn<ProtocolContext<WebviewContext.ClientFunction, any>, WebviewContext.ClientFunction>,
) => void | Promise<void>
