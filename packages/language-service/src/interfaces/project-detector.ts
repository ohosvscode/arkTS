import type { DisposableSignal } from '@arkts/project-detector'
import type { Disposable } from 'vscode'
import type { ProjectDetectorManager } from './project-detector-manager'
import { Project as RustProject, ProjectDetector as RustProjectDetector } from '@arkts/project-detector'
import { UriUtil } from '../utils/uri-util'
import { Project } from './project'

export interface ProjectDetector extends Disposable {
  getProjectDetectorManager(): ProjectDetectorManager
  getUnderlyingProjectDetector(): RustProjectDetector
  findAll(): Project[]
  findByUri(uri: string): Project | undefined
}

export namespace ProjectDetector {
  class ProjectDetectorImpl implements ProjectDetector {
    private readonly projectDetector: RustProjectDetector
    private readonly findAllSignal: DisposableSignal<RustProject[]>
    constructor(
      private readonly projectDetectorManager: ProjectDetectorManager,
      private readonly workspaceFolder: string,
    ) {
      this.projectDetector = RustProjectDetector.create(this.workspaceFolder)
      this.findAllSignal = RustProject.findAll(this.projectDetector)
    }

    getProjectDetectorManager(): ProjectDetectorManager {
      return this.projectDetectorManager
    }

    getUnderlyingProjectDetector(): RustProjectDetector {
      return this.projectDetector
    }

    findAll(): Project[] {
      return this.findAllSignal().map(project => Project.create(this, project))
    }

    findByUri(uri: string): Project | undefined {
      return this.findAll().find(project => UriUtil.isContains(uri, project.getUnderlyingProject().getUri()))
    }

    dispose(): void {
      this.findAllSignal.dispose()
    }
  }

  export function create(projectDetectorManager: ProjectDetectorManager, workspaceFolder: string): ProjectDetector {
    return new ProjectDetectorImpl(projectDetectorManager, workspaceFolder)
  }

  export function is(value: unknown): value is ProjectDetector {
    return value instanceof ProjectDetectorImpl
  }
}
