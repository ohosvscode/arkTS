import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

export interface Dependency {
  packageJsonPath: string
  packageFolderPath: string
  packageJson: Record<string, any>
  dependencies: Record<string, Dependency>
}

export function resolveDependenciesByIdentifier(identifier: string, excludeIdentifiers: string[] = []) {
  const deps: Record<string, Dependency> = {}
  _resolveDependenciesByIdentifier(identifier, deps, import.meta.url, excludeIdentifiers)
  return deps
}

export function collectIdentifiers(deps: Record<string, Dependency>) {
  const identifiers: string[] = []
  for (const identifier of Object.keys(deps)) {
    identifiers.push(identifier)
    identifiers.push(...collectIdentifiers(deps[identifier]?.dependencies ?? {}))
  }
  return [...new Set(identifiers)]
}

function _resolveDependenciesByIdentifier(identifier: string, deps: Record<string, Dependency>, parentPath: string, excludeIdentifiers: string[]) {
  const [packageJsonPath, packageJson] = tryLoadPackageJson(identifier, parentPath)

  deps[identifier] = {
    packageJsonPath,
    packageFolderPath: path.dirname(packageJsonPath),
    packageJson,
    dependencies: {},
  }

  for (const key of Object.keys((packageJson?.dependencies ?? {}) as Record<string, string>)) {
    if (excludeIdentifiers.includes(key)) continue
    _resolveDependenciesByIdentifier(key, deps[identifier].dependencies, path.dirname(packageJsonPath), excludeIdentifiers)
  }
}

function tryLoadPackageJson(identifier: string, parentPath: string): [string, Record<string, any>] {
  const require = createRequire(parentPath)

  try {
    const packageJsonPath = require.resolve(`${identifier}/package.json`)
    return [packageJsonPath, JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))]
  }
  catch {
    const packageMainEntryPath = require.resolve(identifier)
    return tryLoadFileUntilFound(path.dirname(packageMainEntryPath), 'package.json', identifier)
  }
}

function tryLoadFileUntilFound(filePath: string, filename: string, identifier: string): [string, Record<string, any>] {
  if (filename === path.sep) throw new Error(`${filename} not found in ${filePath}.`)
  try {
    const fileContent = fs.readFileSync(path.resolve(filePath, filename), 'utf-8')
    const parseFileContent = JSON.parse(fileContent)
    if (parseFileContent?.name !== identifier) return tryLoadFileUntilFound(path.dirname(filePath), filename, identifier)
    return [path.resolve(filePath, filename), parseFileContent]
  }
  catch {
    return tryLoadFileUntilFound(path.dirname(filePath), filename, identifier)
  }
}
