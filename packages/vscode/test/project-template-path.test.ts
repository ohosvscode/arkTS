import path from 'node:path'
import hbs from 'handlebars'
import { describe, expect, it } from 'vite-plus/test'
import { compileTemplateRelativePath } from '../src/frontend/utils/project-template-path'

const context = { moduleName: 'entry' }

describe('compileTemplateRelativePath', () => {
  it('replaces {{moduleName}} on posix template paths', () => {
    const templateRoot = '/ext/templates/empty-ability'
    const filePath = `${templateRoot}/{{moduleName}}/src/main/ets/pages/Index.ets.hbs`

    expect(compileTemplateRelativePath(templateRoot, filePath, context))
      .toBe('entry/src/main/ets/pages/Index.ets')
  })

  it('replaces {{moduleName}} on windows template paths instead of writing a sibling folder', () => {
    const templateRoot = 'C:\\Users\\me\\.vscode\\extensions\\arkts\\templates\\empty-ability'
    const filePath = `${templateRoot}\\{{moduleName}}\\src\\main\\ets\\pages\\Index.ets.hbs`

    const relativeOutputPath = compileTemplateRelativePath(templateRoot, filePath, context)
    expect(relativeOutputPath).toBe('entry/src/main/ets/pages/Index.ets')

    const savePath = 'C:\\Users\\me\\DevEcoStudioProjects\\MyApplication'
    const outputPath = path.win32.resolve(savePath, relativeOutputPath)
    expect(outputPath).toBe(path.win32.join(savePath, 'entry', 'src', 'main', 'ets', 'pages', 'Index.ets'))
    expect(outputPath).not.toContain('empty-ability{{moduleName}}')
  })

  it('keeps files without placeholders inside the chosen directory', () => {
    const templateRoot = 'C:\\ext\\templates\\empty-ability'
    const filePath = `${templateRoot}\\AppScope\\app.json5.hbs`

    expect(compileTemplateRelativePath(templateRoot, filePath, context))
      .toBe('AppScope/app.json5')
  })
})

describe('create-project windows path bug (issue #219)', () => {
  it('compiling a full windows fsPath escapes \\{{ and resolves as a sibling of savePath', () => {
    const templateRoot = 'C:\\Users\\me\\.vscode\\extensions\\arkts\\templates\\empty-ability'
    const filePath = `${templateRoot}\\{{moduleName}}\\src\\main\\ets\\pages\\Index.ets.hbs`
    const compiled = hbs.compile(filePath)(context)

    expect(compiled).toBe('C:\\Users\\me\\.vscode\\extensions\\arkts\\templates\\empty-ability{{moduleName}}\\src\\main\\ets\\pages\\Index.ets.hbs')

    const relative = path.win32.relative(templateRoot, compiled.replace(/\.hbs$/, ''))
    const savePath = 'C:\\Users\\me\\DevEcoStudioProjects\\MyApplication'
    const outputPath = path.win32.resolve(savePath, relative)
    expect(outputPath).toBe(path.win32.join(
      'C:\\Users\\me\\DevEcoStudioProjects',
      'empty-ability{{moduleName}}',
      'src',
      'main',
      'ets',
      'pages',
      'Index.ets',
    ))
  })
})
