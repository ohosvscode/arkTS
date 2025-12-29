import type { DisposableSignal, ElementJsonFile as RustElementJsonFile } from '@arkts/project-detector'
import type { Disposable } from 'vscode'
import type { ElementDirectory } from './element-directory'
import { ElementJsonFileReference as RustElementJsonFileReference } from '@arkts/project-detector'
import { ElementJsonFileReference } from './element-json-file-reference'

export interface ElementJsonFile extends Disposable {
  getElementDirectory(): ElementDirectory
  getUnderlyingElementJsonFile(): RustElementJsonFile
  findAll(): ElementJsonFileReference[]
}

export namespace ElementJsonFile {
  class ElementJsonFileImpl implements ElementJsonFile {
    private readonly findAllSignal: DisposableSignal<RustElementJsonFileReference[]>
    constructor(
      private readonly elementDirectory: ElementDirectory,
      private readonly rustElementJsonFile: RustElementJsonFile,
    ) {
      this.findAllSignal = RustElementJsonFileReference.findAll(this.rustElementJsonFile)
    }

    getElementDirectory(): ElementDirectory {
      return this.elementDirectory
    }

    getUnderlyingElementJsonFile(): RustElementJsonFile {
      return this.rustElementJsonFile
    }

    findAll(): ElementJsonFileReference[] {
      return this.findAllSignal().map(elementJsonFileReference => ElementJsonFileReference.create(this, elementJsonFileReference))
    }

    dispose(): void {
      this.findAllSignal.dispose()
    }
  }

  export function create(elementDirectory: ElementDirectory, rustElementJsonFile: RustElementJsonFile): ElementJsonFile {
    return new ElementJsonFileImpl(elementDirectory, rustElementJsonFile)
  }

  export function is(value: unknown): value is ElementJsonFile {
    return value instanceof ElementJsonFileImpl
  }
}
