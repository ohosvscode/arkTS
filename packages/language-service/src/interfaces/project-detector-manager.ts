import type { ProjectDetector as RustProjectDetector } from '@arkts/project-detector'
import { UriUtil } from '../utils/uri-util'
import { ProjectDetector } from './project-detector'

/** Empty function, provide a symbol to be used as a dependency injection token for IoC container framework. */
export function ProjectDetectorManager(_v: never): void {}

export interface ProjectDetectorManager {
  emit(type: keyof RustProjectDetector.EventMap, event?: RustProjectDetector.EventMap[keyof RustProjectDetector.EventMap]): this
  delete(workspaceFolder: string): void
  add(workspaceFolder: string): void
  on(type: keyof RustProjectDetector.EventMap, listener: (event: RustProjectDetector.EventMap[keyof RustProjectDetector.EventMap]) => void): this
  findAll(): ProjectDetector[]
  findByUri(uri: string): ProjectDetector | undefined
}

export namespace ProjectDetectorManager {
  class ProjectDetectorManagerImpl implements ProjectDetectorManager {
    private readonly projectDetectors: ProjectDetector[] = []

    constructor(private readonly workspaceFolders: string[]) {
      for (const workspaceFolder of this.workspaceFolders) {
        this.add(workspaceFolder)
      }
    }

    delete(workspaceFolder: string): void {
      for (let index = 0; index < this.projectDetectors.length; index++) {
        if (this.projectDetectors[index].getUnderlyingProjectDetector().getWorkspaceFolder().fsPath === workspaceFolder) {
          this.projectDetectors.splice(index, 1)
          break
        }
      }
    }

    add(workspaceFolder: string): void {
      this.projectDetectors.push(ProjectDetector.create(this, workspaceFolder))
    }

    findAll(): ProjectDetector[] {
      return this.projectDetectors
    }

    findByUri(uri: string): ProjectDetector | undefined {
      return this.projectDetectors.find((projectDetector) => {
        const underlyingProjectDetector = projectDetector.getUnderlyingProjectDetector()
        return underlyingProjectDetector.getWorkspaceFolder().fsPath === uri
          || UriUtil.isContains(uri, underlyingProjectDetector.getWorkspaceFolder())
      })
    }

    emit(type: keyof RustProjectDetector.EventMap, event?: RustProjectDetector.EventMap[keyof RustProjectDetector.EventMap]): this {
      this.projectDetectors.forEach(projectDetector =>
        projectDetector.getUnderlyingProjectDetector()
          .emit(type, event as RustProjectDetector.EventMap[keyof RustProjectDetector.EventMap]),
      )
      return this
    }

    on(type: keyof RustProjectDetector.EventMap, listener: (event: RustProjectDetector.EventMap[keyof RustProjectDetector.EventMap]) => void): this {
      this.projectDetectors.forEach(projectDetector =>
        projectDetector.getUnderlyingProjectDetector()
          .on(type, listener),
      )
      return this
    }
  }

  export function create(workspaceFolders: string[]): ProjectDetectorManager {
    return new ProjectDetectorManagerImpl(workspaceFolders)
  }

  export function is(value: unknown): value is ProjectDetectorManager {
    return value instanceof ProjectDetectorManagerImpl
  }
}
