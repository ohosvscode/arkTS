import type { RawfileDirectory as RustRawfileDirectory } from '@arkts/project-detector'
import type { Resource } from './resource'

export interface RawfileDirectory {
  getUnderlyingRawfileDirectory(): RustRawfileDirectory
  getResource(): Resource
}

export namespace RawfileDirectory {
  class RawfileDirectoryImpl implements RawfileDirectory {
    constructor(
      private readonly resource: Resource,
      private readonly rustRawfileDirectory: RustRawfileDirectory,
    ) {}

    getUnderlyingRawfileDirectory(): RustRawfileDirectory {
      return this.rustRawfileDirectory
    }

    getResource(): Resource {
      return this.resource
    }
  }

  export function create(resource: Resource, rustRawfileDirectory: RustRawfileDirectory | null): RawfileDirectory | null {
    if (rustRawfileDirectory === null) {
      return null
    }
    return new RawfileDirectoryImpl(resource, rustRawfileDirectory)
  }

  export function is(value: unknown): value is RawfileDirectory {
    return value instanceof RawfileDirectoryImpl
  }
}
