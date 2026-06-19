# Repository Guidelines

## Project Structure & Module Organization
This repository is a pnpm monorepo. Core source lives in `packages/`, with:
`packages/arkts-language-server` for language-server logic, `packages/arkts-vfs` for the virtual file system, and `packages/arkts-typescript-plugin` for the TypeScript plugin.

VS Code surface area is under `extensions/`, especially `extensions/arkts-vscode-language-features/` for the main extension, `assets/` for icons, `syntaxes/` for grammar files, `snippets/` for snippet definitions, and `e2e/22/` for HarmonyOS test fixtures. Vendored upstream TypeScript sources live in `externals/arkts-ohos-typescript/`; treat that tree as third-party code unless you are intentionally patching it.

## Build, Test, and Development Commands
- `pnpm build` builds the workspace with `vp pack`.
- `pnpm watch` runs the workspace build in watch mode.
- `pnpm type-check` runs the root TypeScript/Vue type check.
- `pnpm --filter @arkts/typescript-plugin build` builds the plugin package with its dedicated config.
- `pnpm --filter vscode-naily-ets run pack` packages the VS Code extension.
- `cd externals/arkts-ohos-typescript && npm test` runs the vendored TypeScript test suite.

## Coding Style & Naming Conventions
Use TypeScript/ESM with 2-space indentation and single-quoted strings, matching the existing source. Prefer small, focused modules and keep exports explicit. Name tests `*.test.ts`; keep package and folder names aligned with their published or extension identifiers (for example, `arkts-vfs`, `arkts-language-server`).

Linting is driven by `eslint.config.js` and the shared `naily-eslint-config` setup. Avoid introducing formatting drift in generated or vendored files unless the change is intentional.

## Testing Guidelines
`packages/arkts-vfs/test/` contains the main unit tests and uses `vite-plus/test` assertions. Add coverage alongside new behavior, especially around filesystem and compiler edge cases. For the vendored TypeScript fork, update baselines and run the relevant `externals/arkts-ohos-typescript` test command when changing compiler behavior.

## Commit & Pull Request Guidelines
The history uses conventional commit prefixes such as `chore:` and `feat:`; follow the same pattern with concise imperative subjects. Pull requests should summarize the scope, list affected packages, and include screenshots or recordings for UI-facing extension changes. Mention any test commands you ran and call out generated files or baseline updates explicitly.

## Security & Configuration Tips
Do not commit build outputs such as `dist/`, `out/`, `oh_modules/`, or other generated artifacts unless the change specifically requires them. Changes inside `externals/arkts-ohos-typescript/` can be large and should be reviewed carefully for upstream compatibility.
