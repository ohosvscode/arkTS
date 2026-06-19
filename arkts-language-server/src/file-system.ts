import type { FileStat, FileType } from '@volar/language-server'
import type { VolarServer } from './types'
import { URI, Utils } from 'vscode-uri'

export class FileSystemTryReader {
  constructor(private readonly server: VolarServer) {}

  async tryReadFileByString(uriOrPath: string): Promise<string | undefined> {
    for (const uri of [URI.file(uriOrPath), URI.parse(uriOrPath)]) {
      try {
        return await this.server.fileSystem.readFile(uri)
      }
      catch {}
    }
  }

  async tryStatByString(uriOrPath: string): Promise<[FileStat, URI] | undefined> {
    for (const uri of [URI.file(uriOrPath), URI.parse(uriOrPath)]) {
      try {
        const stat = await this.server.fileSystem.stat(uri)
        if (stat) return [stat, uri]
      }
      catch {}
    }
  }

  async tryJoinPathAndReadFileByString(uriOrPath: string, ...paths: string[]): Promise<[string, URI] | undefined> {
    for (const uri of [Utils.joinPath(URI.file(uriOrPath), ...paths), Utils.joinPath(URI.parse(uriOrPath), ...paths)]) {
      try {
        const content = await this.server.fileSystem.readFile(uri)
        if (content) return [content, uri]
      }
      catch {}
    }
  }

  async tryReadDirectory(uri: URI): Promise<[string, FileType][]> {
    try {
      return await this.server.fileSystem.readDirectory(uri)
    }
    catch {
      return []
    }
  }
}
