import type { BirpcReturn } from 'birpc'
import type { ProjectConnectionProtocol } from '../interfaces/project-connection-protocol'
import type { Connection } from '../utils/connection'
import { createConnection } from '../utils/connection'

export interface ProjectConnection extends Connection<ProjectConnectionProtocol.ServerFunction, ProjectConnectionProtocol.ClientFunction> {
  connection: BirpcReturn<ProjectConnectionProtocol.ServerFunction, ProjectConnectionProtocol.ClientFunction>
  createOpenDialog(options: CreateOpenDialogOptions): Promise<string | undefined>
}

export interface CreateOpenDialogOptions extends ProjectConnectionProtocol.ServerFunction.CreateOpenDialog.Options {
  onClose(uri: string[] | undefined): void | Promise<void>
}

export function useProjectConnection(): ProjectConnection {
  const onOpenDialogCallbacks = new Set<(uri: string[] | undefined, dialogId: string) => void>()

  function onOpenDialog(callback: (uri: string[] | undefined, dialogId: string) => void, filterDialogId: (dialogId: string) => boolean): void {
    onOpenDialogCallbacks.add((uri, dialogId) => {
      if (!filterDialogId(dialogId)) return
      callback(uri, dialogId)
    })
  }

  const connection = createConnection<ProjectConnectionProtocol.ServerFunction, ProjectConnectionProtocol.ClientFunction>({
    onOpenDialog: (dialogId, uri) => onOpenDialogCallbacks.forEach(callback => callback(uri, dialogId)),
  })

  async function createOpenDialog(options: CreateOpenDialogOptions): Promise<string | undefined> {
    const { connection } = useProjectConnection()
    const dialogId = await connection.createOpenDialog?.(options)
    onOpenDialog(uri => options.onClose(uri), id => id === dialogId)
    return dialogId
  }

  return {
    createOpenDialog,
    ...connection,
  }
}
