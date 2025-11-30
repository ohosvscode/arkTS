<div align="center">

<img src="./packages/vscode/assets/icon.png" width="100" />

# Naily's ArkTS Support

[English](./README-en.md) | 简体中文

![GitHub Repo stars](https://img.shields.io/github/stars/ohosvscode/arkTS?style=flat)&nbsp;
[![VSCode Marketplace version](https://img.shields.io/visual-studio-marketplace/v/NailyZero.vscode-naily-ets?style=flat&label=vscode%20marketplace%20version)](https://marketplace.visualstudio.com/items?itemName=NailyZero.vscode-naily-ets)&nbsp;
[![@arkts/declarations NPM version](https://img.shields.io/npm/v/%40arkts%2Fdeclarations?logo=npm&logoColor=red&label=arkts%2Fdeclarations)](https://www.npmjs.com/package/@arkts/declarations)&nbsp;
[![@arkts/language-server NPM version](https://img.shields.io/npm/v/%40arkts%2Flanguage-server?logo=npm&logoColor=red&label=arkts%2Flanguage-server)](https://www.npmjs.com/package/@arkts/language-server)&nbsp;
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/ohosvscode/arkTS)&nbsp;
![GitHub repo size](https://img.shields.io/github/repo-size/ohosvscode/arkTS)&nbsp;
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/ohosvscode/arkTS)&nbsp;
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/ohosvscode/arkTS/main?label=Main%20Branch%20Last%20Commit)&nbsp;

</div>

> 刚建了一个QQ群，欢迎加入一起交流学习 (群号: 746153004)

这是一个基于Volar开发的ArkTS VSCode扩展。🌹为似乎到现在还没有支持VSCode，现有的VSCode市场中的ArkTS扩展大都非常简陋，所以决定自己写一个。

## Features

- 🌹 1.x版本开始具备完整的`ArkTS`语言支持，全量支持所有`ArkTS`语法。
- 🎨 **内置文件图标主题**：提供`ArkTS Icons`主题，支持ArkTS文件类型（`.ets`、`.json5`等）和常见Web项目文件（JavaScript、React、CSS、Markdown等），适用于Nx monorepo等混合项目。
- 🖊️ 完善的JSON Schema支持。支持以下文件的JSON Schema：
  - `build-profile.json5` 模块级别/项目级别配置
  - `oh-package.json5` 模块级别/项目级别配置
  - `module.json5` 模块级别/项目级别配置
  - `code-linter.json5` 模块级别/项目级别配置
  - `resources/element/`下所有的`color.json`、`string.json`等的kv值配置
  - `main_pages.json5`配置
  - `AppScope/app.json5`配置
- 📦 1.x版本开始支持安装和管理`OpenHarmony SDK`，并且支持根据当前打开的项目自动探测`API版本`，发出弹窗提示`下载`或`切换`
- 🥇 1.1.6+ 版本开始支持完美的 `$r` 函数补全和跳转、支持 `module.json5` 文件的补全和跳转、`resources/element/` 下所有`json`文件点击查询全局引用；由 [@arkts/project-detector](https://github.com/ohosvscode/project-detector) hvigor项目分析器提供强力支撑 ✊
- 🍞 1.1.8+ 版本开始支持 `module.json5` 文件路径补全和跳转、引用表达式错误诊断、`requestPermissions` 权限补全等一系列 new feature ✨

![截图](./screenshots/edit.gif)

## 插件安装 📦

- Marketplace安装: [https://marketplace.visualstudio.com/items?itemName=NailyZero.vscode-naily-ets](https://marketplace.visualstudio.com/items?itemName=NailyZero.vscode-naily-ets)
- Open VSX安装：[https://open-vsx.org/extension/NailyZero/vscode-naily-ets](https://open-vsx.org/extension/NailyZero/vscode-naily-ets)

或者直接在VSCode中搜索`ArkTS Support`即可。

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

📖 **详细文档**：[ArkTS 文件图标主题完整指南](./ArkTS-File-Icons.md)

### Material Icon Theme（可选）

也可以使用[Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme)，我已经给`Material Icon Theme`提交了PR，目前将`.ets`、`.d.ets`直接用上了`TypeScript官方的文件图标包`，升级到`v5.22.0`之后的版本都可用 👇

![Material icon theme](./screenshots/icon-theme.png)

PR地址: [https://github.com/material-extensions/vscode-material-icon-theme/pull/2966](https://github.com/material-extensions/vscode-material-icon-theme/pull/2966)

## 配置

<!-- configs -->

| Key                | Description                                                                                                | Type      | Default                       | Example                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | --------- | ----------------------------- | --------------------------------------------------------------- |
| `ets.sdkPath`      | %configuration.ets.sdkPath.description%                                                                    | `string`  | `""`                          | ```${os.homedir}/AppData/Local/OpenHarmony/20```                              |
| `ets.baseSdkPath`  | %configuration.ets.baseSdkPath.description%                                                                | `string`  | `"${os.homedir}/OpenHarmony"` | `"${os.homedir}/AppData/Local/OpenHarmony"`                                   |
| `ets.hmsPath`      | %configuration.ets.hmsPath.description%                                                                    | `string`  | `""`                          | <ul><li>Windows: <code>C:/Program Files/Huawei/DevEco Studio/sdk/default/hms</code></li></ul>                             |
| `ets.lspDebugMode` | %configuration.ets.lspDebugMode.description%                                                               | `boolean` | `false`                       | `true`                                                          |
| `ets.hdcPath`      | %configuration.ets.hdcPath.description%                                                                    | `string`  | `""`                          | <ul><li>Unix: <code>/usr/local/bin/hdc</code></li><li>Windows: <code>C:/Program Files/Huawei/DevEco Studio/sdk/default/openharmony/toolchains</code></li></ul>                                             |
| `ets.sdkList`      | A list of installed OpenHarmony SDK paths. Keys should follow the pattern API[number] (e.g., API9, API10). | `object`  | `{}`                          | `{"API20": "${os.homedir}/OpenHarmony/20", "API18": "/opt/OpenHarmony/18"}` |

<!-- configs -->

## 命令

<!-- commands -->

| Command             | Title                        |
| ------------------- | ---------------------------- |
| `ets.restartServer` | ETS: %command.restartServer% |
| `ets.installSDK`    | ETS: %command.installSDK%    |

<!-- commands -->

## 推荐食用搭配

ArkTs-X 组织有维护一个官方的跨平台arkts项目构建管理cli,可用于build和烧录

可以参考以下链接进行安装

[命令行工具](https://gitcode.com/arkui-x/docs/blob/master/zh-cn/application-dev/quick-start/start-overview.md#%E5%91%BD%E4%BB%A4%E8%A1%8C%E5%B7%A5%E5%85%B7ace-tools)

参考使用方式：

```bash
ohos@user Desktop % ace create demo
? Enter the project name(demo): # 输入工程名称，不输入默认为文件夹名称
? Enter the bundleName (com.example.demo):  # 输入包名，不输入默认为com.example.工程名
? Enter the runtimeOS (1: OpenHarmony, 2: HarmonyOS): 1 # 输入RuntimeOS系统
? Please select the Complie SDK (1: 10, 2: 11, 3: 12): 2 # 输入编译SDK版本
Signing iOS app for device deployment using developer identity: "Apple Development: xxxxx"

Project created. Target directory:  ${当前目录}/demo.
In order to run your app, type:

   $ cd demo
   $ ace run

Your app code is in demo/entry.
```

## Star History 🌟

[![Star History Chart](https://api.star-history.com/svg?repos=ohosvscode/arkTS&type=Date)](https://star-history.com/#ohosvscode/arkTS&Date)

![Alt](https://repobeats.axiom.co/api/embed/03ffa3957a86b00b0a96b449852ce4e5518850cf.svg "Repobeats analytics image")

## Contact to Author 📧

- Telegram: [@GCZ_Zero](https://t.me/GCZ_Zero)
- X (Twitter): [@GCZ_Zero](https://x.com/GCZ_Zero)
- QQ: 1203970284，QQ群: 746153004
- WeChat: gcz-zero

### Coffee ☕️

如果觉得这个项目对你有帮助，可以请作者喝杯咖啡 ☕️

也可以加入QQ群，一起交流学习 (群号: 746153004)

<div style="display: flex; gap: 5px;">

<img src="./screenshots/wechat-pay.JPG" width="200" />

<img src="./screenshots/alipay.JPG" width="200" />

<img src="./screenshots/qq.JPG" width="200" />

</div>

## License 📝

[MIT](./LICENSE)
