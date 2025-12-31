import type { QualifierEditorConnectionProtocol } from './interfaces/connection-protocol'
import { bootstrap } from '../webview-entry'

bootstrap<QualifierEditorConnectionProtocol.ServerFunction, QualifierEditorConnectionProtocol.ClientFunction>({})
