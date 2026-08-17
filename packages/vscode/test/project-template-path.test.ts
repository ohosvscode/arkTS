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
    expect(relativeOutputPath).not.toContain('empty-ability{{moduleName}}')
    expect(relativeOutputPath.startsWith('..')).toBe(false)
  })

  it('keeps files without placeholders inside the chosen directory', () => {
    const templateRoot = 'C:\\ext\\templates\\empty-ability'
    const filePath = `${templateRoot}\\AppScope\\app.json5.hbs`

    expect(compileTemplateRelativePath(templateRoot, filePath, context))
      .toBe('AppScope/app.json5')
  })
})

describe('create-project windows path bug (issue #219)', () => {
  it('compiling a full windows fsPath escapes \\{{ so the module name is never substituted', () => {
    const templateRoot = 'C:\\Users\\me\\.vscode\\extensions\\arkts\\templates\\empty-ability'
    const filePath = `${templateRoot}\\{{moduleName}}\\src\\main\\ets\\pages\\Index.ets.hbs`

    expect(hbs.compile(filePath)(context)).toBe(
      'C:\\Users\\me\\.vscode\\extensions\\arkts\\templates\\empty-ability{{moduleName}}\\src\\main\\ets\\pages\\Index.ets.hbs',
    )
  })
})
