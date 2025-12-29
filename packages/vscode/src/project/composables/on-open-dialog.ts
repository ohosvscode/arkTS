import type { ProjectConnectionProtocol } from '../interfaces/connection-protocol'

export function onOpenDialog(callback: (uri: string[] | undefined, dialogId: string) => void, filterDialogId: (dialogId: string) => boolean): void {
  onOpenDialog.callbacks.add((uri, dialogId) => {
    if (!filterDialogId(dialogId)) return
    callback(uri, dialogId)
  })
}

export namespace onOpenDialog {
  export const callbacks = new Set<(uri: string[] | undefined, dialogId: string) => void>()
}

export interface CreateOpenDialogOptions extends ProjectConnectionProtocol.ServerFunction.CreateOpenDialog.Options {
  onClose(uri: string[] | undefined): void | Promise<void>
}

export async function createOpenDialog(options: CreateOpenDialogOptions): Promise<string> {
  const dialogId = await window.connection.createOpenDialog(options)
  onOpenDialog(uri => options.onClose(uri), id => id === dialogId)
  return dialogId
}
