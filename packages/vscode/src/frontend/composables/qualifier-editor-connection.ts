import type { BirpcReturn } from 'birpc'
import type { QualifierEditorConnectionProtocol } from '../interfaces/qualifier-editor-connection-protocol'
import { createConnection } from '../utils/connection'

export function useQualifierEditorConnection(): BirpcReturn<QualifierEditorConnectionProtocol.ServerFunction, QualifierEditorConnectionProtocol.ClientFunction> {
  return createConnection<QualifierEditorConnectionProtocol.ServerFunction, QualifierEditorConnectionProtocol.ClientFunction>({}) as BirpcReturn<QualifierEditorConnectionProtocol.ServerFunction, QualifierEditorConnectionProtocol.ClientFunction>
}
