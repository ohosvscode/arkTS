# Repository Guidelines

## Project Structure & Module Organization
This is a pnpm workspace monorepo. Core packages live under:
- `arkts-language-server/` for the ArkTS language server
- `arkts-vscode-language-features/` for the VS Code extension
- `arkts-vfs/` for the virtual file system helpers
- `arkts-typescript-plugin/` for the TypeScript plugin
- `arkts-ohos-typescript/` for the vendored TypeScript/ArkTS compiler fork and its large test suite

Source code is typically in each package’s `src/` directory. Tests and fixtures live next to the code they verify, for example `arkts-vfs/test/*.test.ts` and `arkts-ohos-typescript/tests/**`. Static assets for the extension are under `arkts-vscode-language-features/assets/`, `snippets/`, `syntaxes/`, and `language/`.

## Build, Test, and Development Commands
- `pnpm build` runs the workspace build via `vp pack`.
- `pnpm watch` runs the same build in watch mode.
- `cd arkts-typescript-plugin && pnpm build` builds the plugin package with its package-local config.
- `cd arkts-ohos-typescript && pnpm test` runs the vendored compiler test suite.
- `cd arkts-ohos-typescript && pnpm run test:system-api` runs the system API check.

Use the package-local command when a task touches only one package; the root commands are for workspace-wide packaging.

## Coding Style & Naming Conventions
TypeScript is the primary language. Follow the existing ESM style, keep imports explicit, and prefer small focused modules. Linting is centralized through `eslint.config.js` and `naily-eslint-config`; `arkts-ohos-typescript/` has its own ESLint setup and should be treated as an upstream-style subtree.

Use `camelCase` for functions and variables, `PascalCase` for types/classes, and descriptive file names that match nearby code, such as `patch-hover.ts` or `createVirtualTypeScriptEnvironment`.

## Testing Guidelines
Keep tests close to the feature. Add or update fixtures in the package that owns the behavior. For ArkTS compiler changes, prefer a failing test first and update baselines only when the behavior change is intentional. Name tests and fixtures so they describe the rule or scenario, such as `arkts-no-var-*` or `*.test.ts`.

## Commit & Pull Request Guidelines
Commit history uses Conventional Commit prefixes such as `feat:` and `chore:`. Keep commit titles short and imperative. Pull requests should explain the change, call out affected packages, and include screenshots or logs when the VS Code extension or language server behavior changes. Link related issues and mention any test or baseline updates explicitly.
