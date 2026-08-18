import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import hbs from 'handlebars'
import { describe, expect, it } from 'vite-plus/test'
import { CREATE_PROJECT_TEMPLATE_LAYERS, resolveProjectTemplateLayers } from '../src/frontend/utils/project-template-layers'

hbs.registerHelper('equal', (a: number | string, b: number | string) => Number(a) === Number(b) || String(a) === String(b))

const templatesRoot = path.resolve(fileURLToPath(new URL('../templates', import.meta.url)))

const defaultContext = {
  moduleName: 'entry',
  projectName: 'MyApplication',
  bundleName: 'com.example.myapplication',
  sdkVersion: 20,
  deviceType: ['phone'],
  modelVersion: '6.0.0',
}

function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath]
  })
}

function renderTemplateLayers(templateName: string, context: Record<string, unknown> = defaultContext): Map<string, string> {
  const output = new Map<string, string>()
  for (const layerName of resolveProjectTemplateLayers(templateName)) {
    const templateRoot = path.join(templatesRoot, layerName)
    for (const filePath of walkFiles(templateRoot)) {
      const relativePath = path.posix.relative(templateRoot.replace(/\\/g, '/'), filePath.replace(/\\/g, '/'))
      const compiledPath = hbs.compile(relativePath)(context).replace(/\.hbs$/, '')
      const content = fs.readFileSync(filePath, 'utf8')
      output.set(compiledPath, path.extname(filePath) === '.hbs' ? hbs.compile(content)(context) : content)
    }
  }
  return output
}

describe('resolveProjectTemplateLayers', () => {
  it('keeps empty-ability as a single layer', () => {
    expect(resolveProjectTemplateLayers('empty-ability')).toEqual(['empty-ability'])
  })

  it('layers official Native C++ files on empty-ability', () => {
    expect(resolveProjectTemplateLayers('native-cpp')).toEqual(['empty-ability', 'native-cpp'])
  })

  it('falls back to the given name for unknown templates', () => {
    expect(resolveProjectTemplateLayers('custom-template')).toEqual(['custom-template'])
  })

  it('registers empty-ability and native-cpp only', () => {
    expect(Object.keys(CREATE_PROJECT_TEMPLATE_LAYERS)).toEqual(['empty-ability', 'native-cpp'])
  })
})

describe('native-cpp template overlay', () => {
  it('keeps empty-ability files and overlays the official Native C++ delta', () => {
    const files = renderTemplateLayers('native-cpp')

    expect(files.has('AppScope/app.json5')).toBe(true)
    expect(files.has('entry/src/main/ets/entryability/EntryAbility.ets')).toBe(true)
    expect(files.get('entry/src/main/cpp/napi_init.cpp')).toContain('.nm_modname = "entry"')
    expect(files.get('entry/src/main/cpp/napi_init.cpp')).toContain('{ "add", nullptr, Add,')
    expect(files.get('entry/src/main/cpp/CMakeLists.txt')).toContain('project(MyApplication)')
    expect(files.get('entry/src/main/cpp/CMakeLists.txt')).toContain('add_library(entry SHARED napi_init.cpp)')
    expect(files.get('entry/src/main/cpp/types/libentry/Index.d.ts')).toContain('export const add:')
    expect(files.get('entry/src/main/cpp/types/libentry/oh-package.json5')).toContain('"name": "libentry.so"')
    expect(files.get('entry/oh-package.json5')).toContain('"libentry.so": "file:./src/main/cpp/types/libentry"')
    expect(files.get('entry/build-profile.json5')).toContain('"path": "./src/main/cpp/CMakeLists.txt"')
    expect(files.get('entry/src/main/ets/pages/Index.ets')).toContain("import testNapi from 'libentry.so'")
    expect(files.get('entry/src/main/ets/pages/Index.ets')).toContain('testNapi.add(2, 3)')
    expect(files.get('entry/src/mock/mock-config.json5')).toContain('"libentry.so"')
    expect(files.get('entry/src/mock/Libentry.mock.ets')).toContain("'add'")
  })

  it('does not add native files to empty-ability', () => {
    const files = renderTemplateLayers('empty-ability')

    expect(files.has('entry/src/main/cpp/napi_init.cpp')).toBe(false)
    expect(files.get('entry/src/main/ets/pages/Index.ets')).not.toContain('libentry.so')
    expect(files.get('entry/build-profile.json5')).not.toContain('externalNativeOptions')
  })

  it('substitutes a custom module name in native paths and NAPI bindings', () => {
    const files = renderTemplateLayers('native-cpp', { ...defaultContext, moduleName: 'feature' })

    expect(files.has('feature/src/main/cpp/napi_init.cpp')).toBe(true)
    expect(files.get('feature/src/main/cpp/napi_init.cpp')).toContain('.nm_modname = "feature"')
    expect(files.get('feature/src/main/cpp/CMakeLists.txt')).toContain('add_library(feature SHARED napi_init.cpp)')
    expect(files.get('feature/oh-package.json5')).toContain('"libfeature.so": "file:./src/main/cpp/types/libfeature"')
    expect(files.get('feature/src/main/ets/pages/Index.ets')).toContain("import testNapi from 'libfeature.so'")
  })
})
