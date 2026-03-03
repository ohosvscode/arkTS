<div align="center">

<img src="./packages/vscode/assets/icon.png" width="100" alt="Icon" />

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

- 🌹 Complete basic syntax highlighting, completion, jump, and diagnostic features for `ArkTS` language (1.x)
- 🎨 ArkTS supports right-click one-key quick formatting, formatting supported by `oxk` toolchain, toolchain written in `Rust`, forked from `oxc project` project, extremely fast ⚡️ Demo repository address: [https://github.com/ohos-rs/oxc-ark](https://github.com/ohos-rs/oxc-ark) Thanks to GitHub @richerfu for his contribution! (1.2.12+)
- 💿 Support the same as `DevEco Studio` emulator image manager, support creating/deleting devices and downloading/deleting emulator images, provided by [@arkts/image-manager](https://github.com/ohosvscode/image-manager) ✊ (1.3.0+)
- 🚀 Support task `tasks.json` and launch configuration `launch.json`, after configuration, you can run hvigor tasks compile project, and run or debug to emulator/real device through `hdc` command (1.3.0+)
- 📦 Support installation and management of `OpenHarmony SDK`, and automatically detect the `API version` of the currently opened project, show popup prompts for `download` or `switch` (1.x)
- ✂️ Support the same as `TypeScript` basic `snippets`, and add `Struct Declaration` and other `ArkTS` unique `Snippets`
- 🥇 Perfect `$r` function completion and jump, support `module.json5` file completion and jump, support global reference query for all `json` files under `resources/element/`; supported by [@arkts/project-detector](https://github.com/ohosvscode/project-detector) hvigor project analyzer ✊ (1.1.6+)
- 🍞 Support `module.json5` file path completion and jump, reference expression error diagnosis, `requestPermissions` permission completion and other new features ✨ (1.1.8+)
- 🌾 hvigor resource explorer panel, support resource qualifier folder creation, resource reference indexing and other functions (based on `@arkts/project-detector` project analyzer) (1.2.10+)
- 🎨 Built-in file icon theme: provide `ArkTS Icons` theme, supporting ArkTS file types (`.ets`, `.json5`, etc.) and common web project files (JavaScript, React, CSS, Markdown, etc.), perfect for Nx monorepos and mixed projects.
- 🖊️ Comprehensive JSON Schema support. Supports the following JSON Schema files:
  - `build-profile.json5` Module-level/Project-level configuration
  - `oh-package.json5` Module-level/Project-level configuration
  - `code-linter.json5` Module-level/Project-level configuration
  - All `color.json` files under `resources/element/` for kv value configuration
  - `module.json5` file configuration
  - `mock-config.json5` file configuration
  - `hvigor-config.json5` file configuration
  - `main_pages.json5` file configuration
  - `AppScope/app.json5` file configuration
  - ...will support more JSON Schema files in the future

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

| Key                                      | Description                                                                 | Type      | Default                       |
| ---------------------------------------- | --------------------------------------------------------------------------- | --------- | ----------------------------- |
| `ets.sdkPath`                            | OpenHarmony SDK path. The ETS Language Server will be restarted when this setting is changed. (This path corresponds to the `sdk/default/openharmony` path in the DevEco Studio installation directory)                                     | `string`  | `""`                          |
| `ets.baseSdkPath`                        | The default OpenHarmony SDK base path. All versions of SDKs will be installed under this path. (This path corresponds to the OpenHarmony SDK location in DevEco Studio settings)                                 | `string`  | `"${os.homedir}/OpenHarmony"` |
| `ets.hmsPath`                            | The path to the HMS SDK path. Because HMS SDK is independent of OpenHarmony SDK, it needs to be set separately. Generally, you can find the SDK in the DevEco Studio installation directory. (This path corresponds to the `sdk/default/harmony` path in the DevEco Studio installation directory)                                     | `string`  | `""`                          |
| `ets.lspDebugMode`                       | Enable ETS Language Server debug logging.                                | `boolean` | `false`                       |
| `ets.ignoreWorkspaceLocalPropertiesFile` | Ignore auto infer the base SDK path from `local.properties` file in the local workspace.          | `boolean` | `false`                       |
| `ets.linterVersion`                      | The version of the ArkTS linter to use. Set to 'off' to disable the linter. | `string`  | `"1.1"`                       |
| `ets.resourceReferenceDiagnostic`        | 未匹配到的 $r() 资源引用的诊断级别                                                        | `string`  | `"error"`                     |
| `ets.localImagePath`                     | The path of the local image folder. The local image folder is used to store the images of the devices.

In MacOS, the default path is `~/Library/Huawei/Sdk`; in Windows, the default path is `%APPDATA%\Local\Huawei\Sdk`.                              | `string`  | ``                            |
| `ets.imageConfigPath`                    | The path to store the HarmonyOS configuration files.

 In macOS, it will be `~/Library/Application Support/Huawei/DevEcoStudio6.0` by default; In Windows, it will be `%APPDATA%\Roaming\Huawei\DevEcoStudio6.0` by default; In other platforms, it will be `~/.huawei/DevEcoStudio6.0` by default.                             | `string`  | ``                            |
| `ets.deployedEmulatorPath`               | The path to store the deployed devices.

 In Windows, the default path is `%APPDATA%\Local\Huawei\Emulator\deployed`; In other platforms, the default path is `~/.huawei/Emulator/deployed`.                        | `string`  | ``                            |
| `ets.emulatorLogPath`                    | The path to store the emulator log files.

 In macOS, the default path is `~/Library/Logs/Huawei/DevEcoStudio6.0`; in Windows, the default path is `%APPDATA%\Local\Huawei\DevEcoStudio6.0\log`; in other platforms, the default path is `~/.huawei/DevEcoStudio6.0/log`.                             | `string`  | ``                            |

<!-- configs -->

## Commands

<!-- commands -->

| Command                                            | Title                                                       |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `ets.restartServer`                                | ETS: Restart ETS Language Server                                |
| `ets.installSDK`                                   | ETS: Install/Switch OpenHarmony SDK                                   |
| `ets.createProject`                                | ETS: Create ArkTS Project                                |
| `ets.resourceExplorer.refresh`                     | ETS: Refresh Hvigor Resource Explorer                     |
| `ets.resourceExplorer.openFile`                    | ETS: Open File in Editor                    |
| `ets.resourceExplorer.openResourceQualifierEditor` | ETS: Open Resource Qualifier Editor |
| `ets.openDeviceManager`                            | ETS: Open Device Manager                            |
| `ets.copyHdcPathToClipboard`                       | ETS: Copy HDC Path                       |

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

<img src="./screenshots/wechat-pay.JPG" width="200" alt="WeChat" />

<img src="./screenshots/alipay.JPG" width="200" alt="Alipay" />

<img src="./screenshots/qq.JPG" width="200" alt="QQ" />

</div>

## License 📝

[MIT](./LICENSE)
