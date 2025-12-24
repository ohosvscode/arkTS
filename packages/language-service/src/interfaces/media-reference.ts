import type { Uri } from '@arkts/project-detector'
import type { MediaDirectory } from './media-directory'
import type { ResourceReference } from './reference'
import fs from 'node:fs'
import path from 'node:path'

export interface MediaReference extends ResourceReference {
  getMediaDirectory(): MediaDirectory
  getRawFileName(): string
  getFileName(): string
  getFileSize(): `${number} B` | `${number} KB` | `${number} MB` | 'unknown'
  getMarkdownPreview(): string
  toEtsFormat(): `app.media.${string}`
  toJsonFormat(): `$media:${string}`
}

export namespace MediaReference {
  class MediaReferenceImpl implements MediaReference {
    constructor(
      private readonly uri: Uri,
      private readonly mediaDirectory: MediaDirectory,
    ) {}

    getUri(): Uri {
      return this.uri
    }

    getFileName(): string {
      return path.basename(this.uri.fsPath)
    }

    getExtName(): string {
      return path.extname(this.uri.fsPath)
    }

    getRawFileName(): string {
      return path.basename(this.uri.fsPath).replace(new RegExp(`${path.extname(this.uri.fsPath)}$`), '')
    }

    getFileSize(): `${number} B` | `${number} KB` | `${number} MB` | 'unknown' {
      try {
        return this.formatFileSize(fs.statSync(this.uri.fsPath).size)
      }
      catch {
        return 'unknown'
      }
    }

    formatFileSize(bytes: number): `${number} B` | `${number} KB` | `${number} MB` {
      if (bytes < 1024) return `${bytes} B` as `${number} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB` as `${number} KB`
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB` as `${number} MB`
    }

    getMarkdownPreview(): string {
      const fileName = this.getFileName()
      const imageUri = this.getUri()

      return `![${fileName}](${imageUri.toString()}|width=200)\n\n`
    }

    toEtsFormat(): `app.media.${string}` {
      return `app.media.${this.getRawFileName()}`
    }

    toJsonFormat(): `$media:${string}` {
      return `$media:${this.getRawFileName()}`
    }

    getMediaDirectory(): MediaDirectory {
      return this.mediaDirectory
    }

    getStart(): number {
      return 0
    }

    getEnd(): number {
      return 0
    }
  }

  export function is(value: unknown): value is MediaReference {
    return value instanceof MediaReferenceImpl
  }

  export function create(uri: Uri, mediaDirectory: MediaDirectory): MediaReference {
    return new MediaReferenceImpl(uri, mediaDirectory)
  }
}
