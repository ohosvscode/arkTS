/**
 * VS Code 1.92.2 (Electron 30 / Node 20.14) cannot `require()` ESM-only
 * packages. The extension host and language server are bundled as CJS, so
 * leaving `@arkts/project-detector` as a runtime require crashes activation
 * with ERR_REQUIRE_ESM. `@ohos-rs/oxk` is CJS and can stay external.
 *
 * Inline the ESM JS loader into the CJS bundle. Keep native platform
 * packages (and other true CJS externals) unbundled.
 *
 * @see https://github.com/ohosvscode/arkTS/issues/224
 */

/** ESM-only packages that must be converted to CJS at bundle time. */
export const ESM_ONLY_NATIVE_JS_PACKAGES = [
  '@arkts/project-detector',
] as const

/** Native/optional binaries and CJS native loaders that must stay unbundled. */
export const NATIVE_PLATFORM_EXTERNAL_PATTERNS = [
  /^@arkts\/project-detector-/,
  /^@ohos-rs\/oxk/,
] as const

export const CJS_NEVER_BUNDLE = [
  'vscode',
  '@aws-sdk/client-s3',
  '@ohos-rs/oxk',
  ...NATIVE_PLATFORM_EXTERNAL_PATTERNS,
] as const

const REQUIRE_CALL_RE = /require\(\s*[`'"]([^`'"]+)[`'"]\s*\)/g

export function isEsmOnlyNativeJsPackage(id: string): boolean {
  return ESM_ONLY_NATIVE_JS_PACKAGES.some(pkg => id === pkg || id.startsWith(`${pkg}/`))
}

export function isNativePlatformPackage(id: string): boolean {
  return NATIVE_PLATFORM_EXTERNAL_PATTERNS.some(pattern => pattern.test(id))
}

export function isCjsNeverBundle(id: string): boolean {
  return CJS_NEVER_BUNDLE.some(item => typeof item === 'string' ? item === id : item.test(id))
}

/** Return `require('…')` specifiers that old VS Code / Node cannot load from CJS. */
export function findEsmOnlyCjsRequires(source: string): string[] {
  const found = new Set<string>()
  for (const match of source.matchAll(REQUIRE_CALL_RE)) {
    const id = match[1]
    if (id && isEsmOnlyNativeJsPackage(id)) found.add(id)
  }
  return [...found].sort()
}
