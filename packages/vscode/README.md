<div align="center">

<img src="https://github.com/ohosvscode/arkTS/blob/next-dev/packages/vscode/assets/icon.png?raw=true" width="100" />

# Naily's ArkTS Support

[English](https://github.com/ohosvscode/arkTS/blob/next/README-en.md) | 简体中文

![GitHub Repo stars](https://img.shields.io/github/stars/ohosvscode/arkTS?style=flat)&nbsp;
[![VSCode Marketplace version](https://img.shields.io/visual-studio-marketplace/v/NailyZero.vscode-naily-ets?style=flat&label=vscode%20marketplace%20version)](https://marketplace.visualstudio.com/items?itemName=NailyZero.vscode-naily-ets)&nbsp;
[![@arkts/declarations NPM version](https://img.shields.io/npm/v/%40arkts%2Fdeclarations?logo=npm&logoColor=red&label=arkts%2Fdeclarations)](https://www.npmjs.com/package/@arkts/declarations)&nbsp;
[![@arkts/language-server NPM version](https://img.shields.io/npm/v/%40arkts%2Flanguage-server?logo=npm&logoColor=red&label=arkts%2Flanguage-server)](https://www.npmjs.com/package/@arkts/language-server)&nbsp;
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/ohosvscode/arkTS)&nbsp;
![GitHub repo size](https://img.shields.io/github/repo-size/ohosvscode/arkTS)&nbsp;
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/ohosvscode/arkTS/main?label=Main%20Branch%20Last%20Commit)&nbsp;

</div>

> 刚建了一个QQ群，欢迎加入一起交流学习 (群号: 746153004)

这是一个基于[Volar](https://volarjs.dev)开发的ArkTS VSCode扩展。🌹为似乎到现在还没有支持VSCode，现有的VSCode市场中的ArkTS扩展大都非常简陋，所以决定自己写一个。

## Features

- 🌹 1.x版本开始具备完整的`ArkTS`语言支持，全量支持所有`ArkTS`语法。
- 🎨 **内置文件图标主题**：提供`ArkTS Icons`主题，支持ArkTS文件类型（`.ets`、`.json5`等）和常见Web项目文件（JavaScript、React、CSS、Markdown等），适用于Nx monorepo等混合项目。
- 🖊️ 完善的JSON Schema支持。支持以下文件的JSON Schema：
  - `build-profile.json5` 模块级别/项目级别配置
  - `oh-package.json5` 模块级别/项目级别配置
  - `code-linter.json5` 模块级别/项目级别配置
  - `resources/element/`下所有的`color.json`等的kv值配置
  - `module.json5` 配置
  - `mock-config.json5`配置
  - `hvigor-config.json5`配置
  - `main_pages.json5`配置
  - `AppScope/app.json5`配置
- 📦 1.x版本开始支持安装和管理`OpenHarmony SDK`，并且支持根据当前打开的项目自动探测`API版本`，发出弹窗提示`下载`或`切换`
- ✨ 1.x版本开始支持`.ets`文件的`代码格式化`和`大纲`展示功能
- ✂️ 支持和`TypeScript`一样的`snippets`，并且添加了`Struct Declaration`等`ArkTS`独有的`Snippets`
- 🥇 1.1.6+ 版本开始支持完美的 `$r` 函数补全和跳转、支持 `module.json5` 文件的补全和跳转、`resources/element/` 下所有`json`文件点击查询全局引用；由 [@arkts/project-detector](https://github.com/ohosvscode/project-detector) hvigor项目分析器提供强力支撑 ✊
- 🍞 1.1.8+ 版本开始支持 `module.json5` 文件路径补全和跳转、引用表达式错误诊断、`requestPermissions` 权限补全等一系列 new feature ✨

## 食用方法 📖

详情请见 [Arkcode 组织文档](https://arkcode.dev/arkts/install)。

## VSCode 文件图标主题 🖼️

### 内置 ArkTS Icons 主题

本扩展内置了`ArkTS Icons`文件图标主题，提供对ArkTS和Web开发文件的完整支持：

**支持的文件类型：**
- **ArkTS文件**：`.ets`、`.hml`、`.json5`配置文件
- **Web开发**：JavaScript (`.js`、`.jsx`)、TypeScript (`.ts`、`.tsx`)、React
- **样式文件**：CSS、SCSS、SASS、LESS、HTML
- **文档**：Markdown (`.md`、`.mdx`)、文本文件
- **配置文件**：`.gitignore`、`.env`、`.eslintrc`、`package.json`、`next.config.js`等
- **常见文件夹**：`node_modules`、`src`、`components`、`pages`、`app`等

**启用方式：**
1. 打开命令面板 (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. 输入 "Preferences: File Icon Theme"
3. 选择 "ArkTS Icons"

或在 `settings.json` 中设置：
```json
{
  "workbench.iconTheme": "arkts-icons"
}
```

### Material Icon Theme（可选）

也可以使用[Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme)，我已经给`Material Icon Theme`提交了PR，目前将`.ets`、`.d.ets`直接用上了`TypeScript官方的文件图标包`，升级到`v5.22.0`之后的版本都可用 👇

![Material icon theme](./screenshots/icon-theme.png)

PR地址: [https://github.com/material-extensions/vscode-material-icon-theme/pull/2966](https://github.com/material-extensions/vscode-material-icon-theme/pull/2966)

## 配置

<!-- configs -->

| Key                                      | Description                                                                                                | Type      | Default                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------- | ----------------------------- |
| `ets.sdkPath`                            | %configuration.ets.sdkPath.description%                                                                    | `string`  | `""`                          |
| `ets.baseSdkPath`                        | %configuration.ets.baseSdkPath.description%                                                                | `string`  | `"${os.homedir}/OpenHarmony"` |
| `ets.hmsPath`                            | %configuration.ets.hmsPath.description%                                                                    | `string`  | `""`                          |
| `ets.lspDebugMode`                       | %configuration.ets.lspDebugMode.description%                                                               | `boolean` | `false`                       |
| `ets.hdcPath`                            | %configuration.ets.hdcPath.description%                                                                    | `string`  | `""`                          |
| `ets.ignoreWorkspaceLocalPropertiesFile` | %configuration.ets.ignoreWorkspaceLocalPropertiesFile.description%                                         | `boolean` | `false`                       |
| `ets.resourceReferenceDiagnostic`        | 未匹配到的 $r() 资源引用的诊断级别                                                                                       | `string`  | `"error"`                     |
| `ets.sdkList`                            | A list of installed OpenHarmony SDK paths. Keys should follow the pattern API[number] (e.g., API9, API10). | `object`  | `{}`                          |

<!-- configs -->

## 命令

<!-- commands -->

| Command             | Title                        |
| ------------------- | ---------------------------- |
| `ets.restartServer` | ETS: %command.restartServer% |
| `ets.installSDK`    | ETS: %command.installSDK%    |

<!-- commands -->
