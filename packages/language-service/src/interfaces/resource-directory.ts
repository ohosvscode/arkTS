import type { DisposableSignal, ResourceDirectory as RustResourceDirectory } from '@arkts/project-detector'
import type { Disposable } from 'vscode'
import type { Resource } from './resource'
import { ElementDirectory as RustElementDirectory, MediaDirectory as RustMediaDirectory, ProfileDirectory as RustProfileDirectory } from '@arkts/project-detector'
import { UriUtil } from '../utils/uri-util'
import { ElementDirectory } from './element-directory'
import { MediaDirectory } from './media-directory'
import { ProfileDirectory } from './profile-directory'

export interface ResourceDirectory extends Disposable {
  getResource(): Resource
  getUnderlyingResourceDirectory(): RustResourceDirectory
  getElementDirectory(): ElementDirectory | null
  getMediaDirectory(): MediaDirectory | null
  getProfileDirectory(): ProfileDirectory | null
}

export namespace ResourceDirectory {
  class ResourceDirectoryImpl implements ResourceDirectory {
    private readonly elementDirectorySignal: DisposableSignal<RustElementDirectory | null>
    private readonly mediaDirectorySignal: DisposableSignal<RustMediaDirectory | null>
    private readonly profileDirectorySignal: DisposableSignal<RustProfileDirectory | null>
    constructor(
      private readonly resource: Resource,
      private readonly rustResourceDirectory: RustResourceDirectory,
    ) {
      this.elementDirectorySignal = RustElementDirectory.from(this.rustResourceDirectory)
      this.mediaDirectorySignal = RustMediaDirectory.from(this.rustResourceDirectory)
      this.profileDirectorySignal = RustProfileDirectory.from(this.rustResourceDirectory)
    }

    getResource(): Resource {
      return this.resource
    }

    getUnderlyingResourceDirectory(): RustResourceDirectory {
      return this.rustResourceDirectory
    }

    getElementDirectory(): ElementDirectory | null {
      return ElementDirectory.create(this, this.elementDirectorySignal())
    }

    getMediaDirectory(): MediaDirectory | null {
      return MediaDirectory.create(this, this.mediaDirectorySignal())
    }

    getProfileDirectory(): ProfileDirectory | null {
      return ProfileDirectory.create(this, this.profileDirectorySignal())
    }

    findByUri(uri: string): ElementDirectory | undefined {
      const elementDirectory = this.getElementDirectory()
      if (!elementDirectory) return undefined
      return UriUtil.isContains(uri, elementDirectory.getUnderlyingElementDirectory().getUri())
        ? elementDirectory.findByUri(uri) ? elementDirectory : undefined
        : undefined
    }

    dispose(): void {
      this.elementDirectorySignal.dispose()
    }
  }

  export function create(resource: Resource, rustResourceDirectory: RustResourceDirectory): ResourceDirectory {
    return new ResourceDirectoryImpl(resource, rustResourceDirectory)
  }

  export function is(value: unknown): value is ResourceDirectory {
    return value instanceof ResourceDirectoryImpl
  }
}
