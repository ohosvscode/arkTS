import type { DisposableSignal, Product as RustProduct } from '@arkts/project-detector'
import type { Disposable } from 'vscode'
import type { ElementJsonFileReference } from './element-json-file-reference'
import type { Module } from './module'
import { Resource as RustResource } from '@arkts/project-detector'
import { UriUtil } from '../utils/uri-util'
import { MediaReference } from './media-reference'
import { ProfileReference } from './profile-reference'
import { Resource } from './resource'

export interface Product extends Disposable {
  getModule(): Module
  getUnderlyingProduct(): RustProduct
  findAll(): Resource[]
  findByUri(uri: string): Resource | undefined
  findElementReference(): ElementJsonFileReference[]
  findMediaReference(): MediaReference[]
  findProfileReference(): ProfileReference[]
  findReference(): (ElementJsonFileReference | MediaReference | ProfileReference)[]
}

export namespace Product {
  class ProductImpl implements Product {
    private readonly resourceFindAllSignal: DisposableSignal<RustResource[]>
    constructor(
      private readonly module: Module,
      private readonly rustProduct: RustProduct,
    ) {
      this.resourceFindAllSignal = RustResource.findAll(this.rustProduct)
    }

    getModule(): Module {
      return this.module
    }

    getUnderlyingProduct(): RustProduct {
      return this.rustProduct
    }

    findAll(): Resource[] {
      return this.resourceFindAllSignal().map(resource => Resource.create(this, resource))
    }

    findByUri(uri: string): Resource | undefined {
      return this.findAll().find(resource => UriUtil.isContains(uri, resource.getUnderlyingResource().getUri()))
    }

    findElementReference(): ElementJsonFileReference[] {
      return this.findAll().flatMap(
        resource => resource.findAll()
          .flatMap(resourceDirectory => resourceDirectory.getElementDirectory())
          .filter(Boolean)
          .flatMap(elementDirectory =>
            elementDirectory!.findAll().flatMap(
              elementJsonFile => elementJsonFile.findAll(),
            ),
          ),
      )
    }

    findMediaReference(): MediaReference[] {
      return this.findAll().flatMap(
        (resource) => {
          return resource.findAll().flatMap(
            (resourceDirectory) => {
              const mediaDirectory = resourceDirectory.getMediaDirectory()
              if (!mediaDirectory) return []
              return mediaDirectory.getUnderlyingMediaDirectory()
                .findAll()
                .map(mediaUri => MediaReference.create(mediaUri, mediaDirectory))
            },
          )
        },
      )
    }

    findProfileReference(): ProfileReference[] {
      return this.findAll().flatMap(
        (resource) => {
          return resource.findAll().flatMap(
            (resourceDirectory) => {
              const profileDirectory = resourceDirectory.getProfileDirectory()
              if (!profileDirectory) return []
              return profileDirectory.getUnderlyingProfileDirectory().findAll().map(profileUri => ProfileReference.create(profileUri, profileDirectory))
            },
          )
        },
      )
    }

    findReference(): (ElementJsonFileReference | MediaReference | ProfileReference)[] {
      return [
        ...this.findElementReference(),
        ...this.findMediaReference(),
        ...this.findProfileReference(),
      ].filter(Boolean) as (ElementJsonFileReference | MediaReference | ProfileReference)[]
    }

    dispose(): void {
      this.resourceFindAllSignal.dispose()
    }
  }

  export function create(module: Module, rustProduct: RustProduct): Product {
    return new ProductImpl(module, rustProduct)
  }

  export function is(value: unknown): value is Product {
    return value instanceof ProductImpl
  }
}
