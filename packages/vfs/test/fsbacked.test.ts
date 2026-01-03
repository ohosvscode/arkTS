import path from 'node:path'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { createFSBackedSystem, createVirtualTypeScriptEnvironment } from '../src'

it('can use a FS backed system ', () => {
  const compilerOpts: ts.CompilerOptions = { target: ts.ScriptTarget.ES2016, esModuleInterop: true }
  const fsMap = new Map<string, string>()

  const content = `/// <reference types="node" />\nimport * as path from 'path';\npath.`
  fsMap.set('index.ts', content)

  const monorepoRoot = path.join(__dirname, '..', '..', '..')
  const system = createFSBackedSystem(fsMap, monorepoRoot, ts)
  const env = createVirtualTypeScriptEnvironment(system, ['index.ts'], ts, compilerOpts)

  const completions = env.languageService.getCompletionsAtPosition('index.ts', content.length, {})
  const hasPathJoinFunc = completions?.entries.find(c => c.name === 'join')
  expect(hasPathJoinFunc).toBeTruthy()
}, 10000)

it('can use a FS backed system to extract node modules', () => {
  const compilerOpts: ts.CompilerOptions = { target: ts.ScriptTarget.ES2016, esModuleInterop: true }
  const fsMap = new Map<string, string>()

  const content = `import fg from "fast-glob"\nfg.sy`
  fsMap.set('index.ts', content)

  const monorepoRoot = path.join(__dirname, '..', '..', '..')
  const system = createFSBackedSystem(fsMap, monorepoRoot, ts)
  const env = createVirtualTypeScriptEnvironment(system, ['index.ts'], ts, compilerOpts)

  const completions = env.languageService.getCompletionsAtPosition('index.ts', content.length, {})

  const hasReactComponentInCompletions = completions?.entries.find(c => c.name === 'sync')
  expect(hasReactComponentInCompletions).toBeTruthy()
}, 10000)

it('can import files in the virtual fs', () => {
  const compilerOpts: ts.CompilerOptions = { target: ts.ScriptTarget.ES2016, esModuleInterop: true }
  const fsMap = new Map<string, string>()

  const monorepoRoot = path.join(__dirname, '..', '..', '..')
  const fakeFolder = path.join(monorepoRoot, 'fake')
  const exporter = path.join(fakeFolder, 'file-with-export.ts')
  const index = path.join(fakeFolder, 'index.ts')

  // TODO: the VFS should really be normalizing paths when looking into fsMap instead.
  fsMap.set(exporter.replace(/\\/g, '/'), `export const helloWorld = "Example string";`)
  fsMap.set(index.replace(/\\/g, '/'), `import {helloWorld} from "./file-with-export"; console.log(helloWorld)`)

  const system = createFSBackedSystem(fsMap, monorepoRoot, ts)
  const env = createVirtualTypeScriptEnvironment(system, [index, exporter], ts, compilerOpts)

  const errs: import('typescript').Diagnostic[] = []
  errs.push(...env.languageService.getSemanticDiagnostics(index))
  errs.push(...env.languageService.getSyntacticDiagnostics(index))

  expect(errs.map(e => e.messageText)).toEqual([])
})

it('searches node_modules/@types', () => {
  const compilerOpts: ts.CompilerOptions = { target: ts.ScriptTarget.ES2016, esModuleInterop: true }
  const monorepoRoot = path.join(__dirname, '..', '..', '..')

  const fsMap = new Map<string, string>()
  fsMap.set('index.ts', '/// <reference types="vitest/globals" />\nit(\'found @types/vitest\', () => undefined)')

  const system = createFSBackedSystem(fsMap, monorepoRoot, ts)
  const env = createVirtualTypeScriptEnvironment(system, ['index.ts'], ts, compilerOpts)

  const semDiags = env.languageService.getSemanticDiagnostics('index.ts')
  expect(semDiags.length).toBe(0)
})

it('can delete files in the virtual fs', () => {
  const compilerOpts: ts.CompilerOptions = { target: ts.ScriptTarget.ES2016, esModuleInterop: true }
  const fsMap = new Map<string, string>()

  const monorepoRoot = path.join(__dirname, '..', '..', '..')
  const fakeFolder = path.join(monorepoRoot, 'fake')
  const exporter = path.join(fakeFolder, 'file-with-export.ts')
  const index = path.join(fakeFolder, 'index.ts')

  // TODO: the VFS should really be normalizing paths when looking into fsMap instead.
  fsMap.set(exporter.replace(/\\/g, '/'), `export const helloWorld = "Example string";`)
  fsMap.set(index.replace(/\\/g, '/'), `import {helloWorld} from "./file-with-export"; console.log(helloWorld)`)

  const system = createFSBackedSystem(fsMap, monorepoRoot, ts)
  const env = createVirtualTypeScriptEnvironment(system, [index, exporter], ts, compilerOpts)

  expect(env.getSourceFile(index)).toBeTruthy()

  env.deleteFile(index)

  expect(env.getSourceFile(index)).toBeFalsy()
})
