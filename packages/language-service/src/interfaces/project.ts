import type { DisposableSignal, Project as RustProject } from '@arkts/project-detector'
import type { Disposable } from 'vscode'
import type { ProjectDetector } from './project-detector'
import { Module as RustModule } from '@arkts/project-detector'
import { UriUtil } from '../utils/uri-util'
import { Module } from './module'

export interface Project extends Disposable {
  getProjectDetector(): ProjectDetector
  getUnderlyingProject(): RustProject
  findAll(): Module[]
  findByUri(uri: string): Module | undefined
  dispose(): void
}

export namespace Project {
  class ProjectImpl implements Project {
    private readonly findAllSignal: DisposableSignal<RustModule[]>
    constructor(
      private readonly projectDetector: ProjectDetector,
      private readonly rustProject: RustProject,
    ) {
      this.findAllSignal = RustModule.findAll(this.rustProject)
    }

    getProjectDetector(): ProjectDetector {
      return this.projectDetector
    }

    getUnderlyingProject(): RustProject {
      return this.rustProject
    }

    findAll(): Module[] {
      return this.findAllSignal().map(module => Module.create(this, module))
    }

    findByUri(uri: string): Module | undefined {
      return this.findAll().find(module => UriUtil.isContains(uri, module.getUnderlyingModule().getUri()))
    }

    dispose(): void {
      this.findAllSignal.dispose()
    }
  }

  export function create(projectDetector: ProjectDetector, rustProject: RustProject): Project {
    return new ProjectImpl(projectDetector, rustProject)
  }

  export function is(value: unknown): value is Project {
    return value instanceof ProjectImpl
  }
}
