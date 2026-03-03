import type { QualifierEditorConnectionProtocol } from '../interfaces/qualifier-editor-connection-protocol'
import type { Connection } from '../utils/connection'
import { createConnection } from '../utils/connection'

export function useQualifierEditorConnection(): Connection<QualifierEditorConnectionProtocol.ServerFunction, QualifierEditorConnectionProtocol.ClientFunction> {
  return createConnection<QualifierEditorConnectionProtocol.ServerFunction, QualifierEditorConnectionProtocol.ClientFunction>({})
}
