import path from 'node:path'
import hbs from 'handlebars'

/**
 * Compile a template file's path relative to the template root.
 *
 * Template directory names may contain Handlebars placeholders such as `{{moduleName}}`.
 * The previous implementation compiled the full `fsPath`. On Windows that path uses `\`,
 * and Handlebars treats `\{{` as an escaped literal `{{`. So
 * `...\empty-ability\{{moduleName}}\Index.ets.hbs` becomes
 * `...\empty-ability{{moduleName}}\Index.ets.hbs`.
 * `path.relative(templateRoot, compiledPath)` then yields `..\empty-ability{{moduleName}}\...`,
 * and `path.resolve(savePath, that)` writes a sibling of the chosen directory.
 *
 * Compile only the relative path, using POSIX separators, so placeholders stay intact
 * on every platform.
 */
export function compileTemplateRelativePath(
  templateRoot: string,
  templateFilePath: string,
  context: Record<string, unknown>,
): string {
  const normalizedRoot = templateRoot.replace(/\\/g, '/')
  const normalizedFile = templateFilePath.replace(/\\/g, '/')
  const relativePath = path.posix.relative(normalizedRoot, normalizedFile)
  return hbs.compile(relativePath)(context).replace(/\.hbs$/, '')
}
