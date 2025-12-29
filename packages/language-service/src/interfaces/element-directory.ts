import type { DisposableSignal, ElementDirectory as RustElementDirectory } from '@arkts/project-detector'
import type { Disposable } from 'vscode'
import type { ResourceDirectory } from './resource-directory'
import { ElementJsonFile as RustElementJsonFile } from '@arkts/project-detector'
import { UriUtil } from '../utils/uri-util'
import { ElementJsonFile } from './element-json-file'

export interface ElementDirectory extends Disposable {
  getResourceDirectory(): ResourceDirectory
  getUnderlyingElementDirectory(): RustElementDirectory
  findAll(): ElementJsonFile[]
  findByUri(uri: string): ElementJsonFile | undefined
}

export namespace ElementDirectory {
  class ElementDirectoryImpl implements ElementDirectory {
    private readonly findAllSignal: DisposableSignal<RustElementJsonFile[]>
    constructor(
      private readonly resourceDirectory: ResourceDirectory,
      private readonly rustElementDirectory: RustElementDirectory,
    ) {
      this.findAllSignal = RustElementJsonFile.findAll(this.rustElementDirectory)
    }

    getResourceDirectory(): ResourceDirectory {
      return this.resourceDirectory
    }

    getUnderlyingElementDirectory(): RustElementDirectory {
      return this.rustElementDirectory
    }

    findAll(): ElementJsonFile[] {
      return this.findAllSignal().map(elementJsonFile => ElementJsonFile.create(this, elementJsonFile))
    }

    findByUri(uri: string): ElementJsonFile | undefined {
      return this.findAll().find(elementJsonFile => UriUtil.isContains(uri, elementJsonFile.getUnderlyingElementJsonFile().getUri()))
    }

    dispose(): void {
      this.findAllSignal.dispose()
    }
  }

  export function create(resourceDirectory: ResourceDirectory, rustElementDirectory: RustElementDirectory | null): ElementDirectory | null {
    if (rustElementDirectory === null) {
      return null
    }
    return new ElementDirectoryImpl(resourceDirectory, rustElementDirectory)
  }

  export function is(value: unknown): value is ElementDirectory {
    return value instanceof ElementDirectoryImpl
  }
}
