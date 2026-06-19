import type { VolarServer } from './types'
import { FileType } from '@volar/language-server'
import { URI, Utils } from 'vscode-uri'
import { FileSystemTryReader } from './file-system'

export interface LibraryScannerOptions {
  /**
   * The Volar server.
   */
  readonly server: VolarServer

  /**
   * The SDK path.
   */
  readonly sdkPath: URI

  /**
   * The type of the project.
   */
  readonly type: 'node' | 'browser'

  /**
   * The file URI.
   */
  readonly fileUri: string
}

export interface LibraryScanner {
  /**
   * Get the libraries.
   */
  getLibraries(): string[]
}

export async function createLibraryScanner(options: LibraryScannerOptions): Promise<LibraryScanner> {
  const fsr = new FileSystemTryReader(options.server)
  const libraries = new Set<string>()

  // component directory
  const componentDirectoryUri = Utils.joinPath(options.sdkPath, 'ets', 'component')
  const componentDirectory = await fsr.tryReadDirectory(componentDirectoryUri)
  console.warn(`[LibraryScanner] Found ${componentDirectory.length} files in ${componentDirectoryUri.toString()} directory.`)

  for (const [name, type] of componentDirectory) {
    if (!name.endsWith('.d.ts') && !name.endsWith('.d.ets')) continue
    if (type !== FileType.File) continue
    const fileUri = Utils.joinPath(componentDirectoryUri, name)
    libraries.add(options.type === 'node' ? fileUri.fsPath : fileUri.toString())
  }

  // declarations directory
  const declarationsDirectoryUri = Utils.joinPath(options.sdkPath, 'ets', 'build-tools', 'ets-loader', 'declarations')
  const declarationsDirectory = await fsr.tryReadDirectory(declarationsDirectoryUri)
  console.warn(`[LibraryScanner] Found ${declarationsDirectory.length} files in ${declarationsDirectoryUri.toString()} directory.`)

  for (const [name, type] of declarationsDirectory) {
    if (!name.endsWith('.d.ts') && !name.endsWith('.d.ets')) continue
    if (type !== FileType.File) continue
    const fileUri = Utils.joinPath(declarationsDirectoryUri, name)
    libraries.add(options.type === 'node' ? fileUri.fsPath : fileUri.toString())
  }

  // basic typescript internal library
  const basicTypescriptInternalLibraryDirectoryUri = Utils.joinPath(URI.parse(options.fileUri), '..', 'lib')
  const basicTypescriptInternalLibraryDirectory = await fsr.tryReadDirectory(basicTypescriptInternalLibraryDirectoryUri)
  console.warn(`[LibraryScanner] Found ${basicTypescriptInternalLibraryDirectory.length} files in ${basicTypescriptInternalLibraryDirectoryUri.toString()} directory.`)

  for (const [name, type] of basicTypescriptInternalLibraryDirectory) {
    if (!name.endsWith('.d.ts') && !name.endsWith('.d.ets')) continue
    if (type !== FileType.File) continue
    const fileUri = Utils.joinPath(basicTypescriptInternalLibraryDirectoryUri, name)
    libraries.add(options.type === 'node' ? fileUri.fsPath : fileUri.toString())
  }

  return {
    getLibraries: () => Array.from(libraries),
  }
}
