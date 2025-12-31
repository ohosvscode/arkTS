import type { ProjectConnectionProtocol } from './interfaces/connection-protocol'
import { bootstrap } from '../webview-entry'

bootstrap<ProjectConnectionProtocol.ServerFunction, ProjectConnectionProtocol.ClientFunction>({
  onOpenDialog: (dialogId, uri) => onOpenDialog.callbacks.forEach(callback => callback(uri, dialogId)),
})
