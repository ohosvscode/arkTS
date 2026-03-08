import type { LanguageServerLogger } from '@arkts/shared'
import type { Connection, InitializeParams, WorkspaceFolder } from '@volar/language-server'
import { ProjectDetectorManager } from '@arkts/language-service'
import { Uri } from '@arkts/project-detector'
import { FileChangeType } from '@volar/language-server'

export class ProjectDetectorManagerService {
  private _workspaceFolders: WorkspaceFolder[] | undefined
  private _projectDetectorManager: ProjectDetectorManager | undefined

  constructor(
    connection: Connection,
    private readonly params: InitializeParams,
    private readonly logger: LanguageServerLogger,
  ) {
    this._workspaceFolders = this.params.workspaceFolders ?? []
    this._projectDetectorManager = ProjectDetectorManager.create(this._workspaceFolders?.map(folder => folder.uri) ?? [])
    this.logger.getConsola().info(`Workspace folders: ${this._workspaceFolders?.map(folder => folder.uri).join(', ')}`)

    connection.onDidChangeWatchedFiles((e) => {
      try {
        for (const file of e.changes) {
          switch (file.type) {
            case FileChangeType.Changed:
              this._projectDetectorManager?.emit('file-changed', Uri.file(file.uri))
              break
            case FileChangeType.Created:
              this._projectDetectorManager?.emit('file-created', Uri.file(file.uri))
              break
            case FileChangeType.Deleted:
              this._projectDetectorManager?.emit('file-deleted', Uri.file(file.uri))
              break
          }
        }
      }
      catch (error) {
        logger.getConsola().error('Error in change watched files handler:', error)
        console.error(error)
        // eslint-disable-next-line no-console
        console.trace(error)
      }
    })
  }

  getProjectDetectorManager(): ProjectDetectorManager {
    return this._projectDetectorManager!
  }
}
