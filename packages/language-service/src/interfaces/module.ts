import type { DisposableSignal, Module as RustModule } from '@arkts/project-detector'
import type { Disposable } from 'vscode'
import type { ElementJsonFileReference } from './element-json-file-reference'
import type { Project } from './project'
import { Product as RustProduct } from '@arkts/project-detector'
import { UriUtil } from '../utils/uri-util'
import { Product } from './product'

export interface Module extends Disposable {
  getProject(): Project
  getUnderlyingModule(): RustModule
  findAll(): Product[]
  findByUri(uri: string): Product | undefined
  findElementReference(): ElementJsonFileReference[]
}

export namespace Module {
  class ModuleImpl implements Module {
    private readonly findAllSignal: DisposableSignal<RustProduct[]>
    constructor(
      private readonly project: Project,
      private readonly rustModule: RustModule,
    ) {
      this.findAllSignal = RustProduct.findAll(this.rustModule)
    }

    getProject(): Project {
      return this.project
    }

    getUnderlyingModule(): RustModule {
      return this.rustModule
    }

    findAll(): Product[] {
      return this.findAllSignal().map(product => Product.create(this, product))
    }

    findByUri(uri: string): Product | undefined {
      return this.findAll().find(product => (
        product.findAll().some(resource => UriUtil.isContains(uri, resource.getUnderlyingResource().getUri()))
        || product.getUnderlyingProduct().getSourceDirectories().some(sourceUri => UriUtil.isContains(uri, sourceUri))
      ))
    }

    findElementReference(): ElementJsonFileReference[] {
      return this.findAll().flatMap(
        product => product.findAll().flatMap(
          resource => resource.findAll()
            .flatMap(resourceDirectory => resourceDirectory.getElementDirectory())
            .filter(Boolean)
            .flatMap(elementDirectory =>
              elementDirectory!.findAll().flatMap(
                elementJsonFile => elementJsonFile.findAll(),
              ),
            ),
        ),
      )
    }

    dispose(): void {
      this.findAllSignal.dispose()
    }
  }

  export function create(project: Project, rustModule: RustModule): Module {
    return new ModuleImpl(project, rustModule)
  }

  export function is(value: unknown): value is Module {
    return value instanceof ModuleImpl
  }
}
