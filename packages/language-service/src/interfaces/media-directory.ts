import type { MediaDirectory as RustMediaDirectory } from '@arkts/project-detector'
import type { ResourceDirectory } from './resource-directory'

export interface MediaDirectory {
  getUnderlyingMediaDirectory(): RustMediaDirectory
  getResourceDirectory(): ResourceDirectory
}

export namespace MediaDirectory {
  class MediaDirectoryImpl implements MediaDirectory {
    constructor(
      private readonly resourceDirectory: ResourceDirectory,
      private readonly rustMediaDirectory: RustMediaDirectory,
    ) {}

    getUnderlyingMediaDirectory(): RustMediaDirectory {
      return this.rustMediaDirectory
    }

    getResourceDirectory(): ResourceDirectory {
      return this.resourceDirectory
    }
  }

  export function create(resourceDirectory: ResourceDirectory, rustMediaDirectory: RustMediaDirectory | null): MediaDirectory | null {
    if (rustMediaDirectory === null) {
      return null
    }
    return new MediaDirectoryImpl(resourceDirectory, rustMediaDirectory)
  }

  export function is(value: unknown): value is MediaDirectory {
    return value instanceof MediaDirectoryImpl
  }
}
