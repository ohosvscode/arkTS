<div align="center">

<img src="./packages/vscode/assets/icon.png" width="100" />

# Naily's ArkTS Support

English | [简体中文](./README.md)

![GitHub Repo stars](https://img.shields.io/github/stars/ohosvscode/arkTS?style=flat)&nbsp;
[![VSCode Marketplace version](https://img.shields.io/visual-studio-marketplace/v/NailyZero.vscode-naily-ets?style=flat&label=vscode%20marketplace%20version)](https://marketplace.visualstudio.com/items?itemName=NailyZero.vscode-naily-ets)&nbsp;
[![@arkts/declarations NPM version](https://img.shields.io/npm/v/%40arkts%2Fdeclarations?logo=npm&logoColor=red&label=arkts%2Fdeclarations)](https://www.npmjs.com/package/@arkts/declarations)&nbsp;
[![@arkts/language-server NPM version](https://img.shields.io/npm/v/%40arkts%2Flanguage-server?logo=npm&logoColor=red&label=arkts%2Flanguage-server)](https://www.npmjs.com/package/@arkts/language-server)&nbsp;
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/ohosvscode/arkTS)&nbsp;
![GitHub repo size](https://img.shields.io/github/repo-size/ohosvscode/arkTS)&nbsp;
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/ohosvscode/arkTS)&nbsp;
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/ohosvscode/arkTS/main?label=Main%20Branch%20Last%20Commit)&nbsp;

</div>

> A QQ group has been created. Feel free to join for learning and discussion (Group ID: 746153004)

This is an ArkTS VSCode extension developed based on Volar. 🌹 It appears that there has been no proper support for ArkTS in VSCode until now. Most of the existing ArkTS extensions in the VSCode marketplace are very basic, so I decided to write one myself.

## Features

- 🌹 Starting from version 1.x, complete `ArkTS` language support is available, fully supporting all `ArkTS` syntax.
- 🎨 **Built-in File Icon Theme**: Provides the `ArkTS Icons` theme, supporting ArkTS file types (`.ets`, `.json5`, etc.) and common web project files (JavaScript, React, CSS, Markdown, etc.), perfect for Nx monorepos and mixed projects.
- 🖊️ Comprehensive JSON Schema support. Supports the following JSON Schema files:
  - `build-profile.json5` Module-level/Project-level configuration
  - `oh-package.json5` Module-level/Project-level configuration
  - `module.json5` Module-level/Project-level configuration
  - `code-linter.json5` Module-level/Project-level configuration
  - All `color.json` files under `resources/element/` for kv value configuration
  - `main_pages.json5`file configuration
  - `AppScope/app.json5` file configuration
- 📦 Starting from version 1.x, supports installation and management of `OpenHarmony SDK`, and automatically detects the `API version` of the currently opened project, showing popup prompts for `download` or `switch`
- 🥇 Starting from version 1.1.6+, supports perfect `$r` function completion and jump, supports `module.json5` file completion and jump, supports global reference query for all `json` files under `resources/element/`; supported by [@arkts/project-detector](https://github.com/ohosvscode/project-detector) hvigor project analyzer ✊
- 🍞 Starting from version 1.1.8+, supports `module.json5` file path completion and jump, reference expression error diagnosis, `requestPermissions` permission completion and other new features ✨

![Screenshot](./screenshots/edit.gif)

## Extension Installation 📦

- Marketplace installation: [https://marketplace.visualstudio.com/items?itemName=NailyZero.vscode-naily-ets](https://marketplace.visualstudio.com/items?itemName=NailyZero.vscode-naily-ets)
- Open VSX installation: [https://open-vsx.org/extension/NailyZero/vscode-naily-ets](https://open-vsx.org/extension/NailyZero/vscode-naily-ets)

Or simply search for `ArkTS Support` in VSCode.

## Usage Guide 📖

Please refer to [Arkcode Organization Documentation](https://arkcode.dev/arkts/install).

## VSCode File Icon Theme 🖼️

### Built-in ArkTS Icons Theme

This extension includes the `ArkTS Icons` file icon theme, providing comprehensive support for ArkTS and web development files:

**Supported File Types:**
- **ArkTS Files**: `.ets`, `.hml`, `.json5` config files
- **Web Development**: JavaScript (`.js`, `.jsx`), TypeScript (`.ts`, `.tsx`), React
- **Styling**: CSS, SCSS, SASS, LESS, HTML
- **Documentation**: Markdown (`.md`, `.mdx`), text files
- **Config Files**: `.gitignore`, `.env`, `.eslintrc`, `package.json`, `next.config.js`, etc.
- **Common Folders**: `node_modules`, `src`, `components`, `pages`, `app`, etc.

**How to Enable:**
1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type: "Preferences: File Icon Theme"
3. Select "ArkTS Icons"

Or set in `settings.json`:
```json
{
  "workbench.iconTheme": "arkts-icons"
}
```

📖 **Full Documentation**: [ArkTS File Icons Theme Guide](./ArkTS-File-Icons-en.md)

### Material Icon Theme (Optional)

You can also use [Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme). I've submitted a PR to `Material Icon Theme`, and currently `.ets` and `.d.ets` files directly use the `TypeScript official file icon pack`. This is available in versions after upgrading to `v5.22.0` 👇

![Material icon theme](./screenshots/icon-theme.png)

PR address: [https://github.com/material-extensions/vscode-material-icon-theme/pull/2966](https://github.com/material-extensions/vscode-material-icon-theme/pull/2966)

## Configuration

<!-- configs -->

| Key                | Description                                                                                                | Type      | Default                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | --------- | ----------------------------- |
| `ets.sdkPath`      | %configuration.ets.sdkPath.description%                                                                    | `string`  | `""`                          |
| `ets.baseSdkPath`  | %configuration.ets.baseSdkPath.description%                                                                | `string`  | `"${os.homedir}/OpenHarmony"` |
| `ets.hmsPath`      | %configuration.ets.hmsPath.description%                                                                    | `string`  | `""`                          |
| `ets.lspDebugMode` | %configuration.ets.lspDebugMode.description%                                                               | `boolean` | `false`                       |
| `ets.hdcPath`      | %configuration.ets.hdcPath.description%                                                                    | `string`  | `""`                          |
| `ets.sdkList`      | A list of installed OpenHarmony SDK paths. Keys should follow the pattern API[number] (e.g., API9, API10). | `object`  | `{}`                          |

<!-- configs -->

## Commands

<!-- commands -->

| Command             | Title                        |
| ------------------- | ---------------------------- |
| `ets.restartServer` | ETS: %command.restartServer% |
| `ets.installSDK`    | ETS: %command.installSDK%    |

<!-- commands -->

## Star History 🌟

[![Star History Chart](https://api.star-history.com/svg?repos=ohosvscode/arkTS&type=Date)](https://star-history.com/#ohosvscode/arkTS&Date)

![Alt](https://repobeats.axiom.co/api/embed/03ffa3957a86b00b0a96b449852ce4e5518850cf.svg "Repobeats analytics image")

## Contact to Author 📧

- Telegram: [@GCZ_Zero](https://t.me/GCZ_Zero)
- X (Twitter): [@GCZ_Zero](https://x.com/GCZ_Zero)
- QQ: 1203970284，QQ Group: 746153004
- WeChat: gcz-zero

### Coffee ☕️

If this project helps you, consider buying the author a coffee ☕️

You can also join the QQ group for further discussions (Group ID: 746153004)

<div style="display: flex; gap: 5px;">

<img src="./screenshots/wechat-pay.JPG" width="200" />

<img src="./screenshots/alipay.JPG" width="200" />

<img src="./screenshots/qq.JPG" width="200" />

</div>

## License 📝

[MIT](./LICENSE)
