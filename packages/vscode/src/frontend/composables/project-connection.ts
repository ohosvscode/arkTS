import type { BirpcReturn } from 'birpc'
import type { ProjectConnectionProtocol } from '../interfaces/project-connection-protocol'
import { createConnection } from '../utils/connection'

export function useProjectConnection(): BirpcReturn<ProjectConnectionProtocol.ServerFunction, ProjectConnectionProtocol.ClientFunction> {
  return createConnection<ProjectConnectionProtocol.ServerFunction, ProjectConnectionProtocol.ClientFunction>({
    onOpenDialog: (dialogId, uri) => onOpenDialog.callbacks.forEach(callback => callback(uri, dialogId)),
  }) as BirpcReturn<ProjectConnectionProtocol.ServerFunction, ProjectConnectionProtocol.ClientFunction>
}
