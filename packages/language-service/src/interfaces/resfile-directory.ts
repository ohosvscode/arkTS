import type { ResfileDirectory as RustResfileDirectory } from '@arkts/project-detector'
import type { Resource } from './resource'

export interface ResfileDirectory {
  getUnderlyingResfileDirectory(): RustResfileDirectory
  getResource(): Resource
}

export namespace ResfileDirectory {
  class ResfileDirectoryImpl implements ResfileDirectory {
    constructor(
      private readonly resource: Resource,
      private readonly rustResfileDirectory: RustResfileDirectory,
    ) {}

    getUnderlyingResfileDirectory(): RustResfileDirectory {
      return this.rustResfileDirectory
    }

    getResource(): Resource {
      return this.resource
    }
  }

  export function create(resource: Resource, rustResfileDirectory: RustResfileDirectory | null): ResfileDirectory | null {
    if (rustResfileDirectory === null) {
      return null
    }
    return new ResfileDirectoryImpl(resource, rustResfileDirectory)
  }

  export function is(value: unknown): value is ResfileDirectory {
    return value instanceof ResfileDirectoryImpl
  }
}
