import type { ProfileDirectory as RustProfileDirectory } from '@arkts/project-detector'
import type { ResourceDirectory } from './resource-directory'

export interface ProfileDirectory {
  getUnderlyingProfileDirectory(): RustProfileDirectory
  getResourceDirectory(): ResourceDirectory
}

export namespace ProfileDirectory {
  class ProfileDirectoryImpl implements ProfileDirectory {
    constructor(
      private readonly resourceDirectory: ResourceDirectory,
      private readonly rustProfileDirectory: RustProfileDirectory,
    ) {}

    getUnderlyingProfileDirectory(): RustProfileDirectory {
      return this.rustProfileDirectory
    }

    getResourceDirectory(): ResourceDirectory {
      return this.resourceDirectory
    }
  }

  export function create(resourceDirectory: ResourceDirectory, rustProfileDirectory: RustProfileDirectory | null): ProfileDirectory | null {
    if (rustProfileDirectory === null) {
      return null
    }
    return new ProfileDirectoryImpl(resourceDirectory, rustProfileDirectory)
  }

  export function is(value: unknown): value is ProfileDirectory {
    return value instanceof ProfileDirectoryImpl
  }
}
