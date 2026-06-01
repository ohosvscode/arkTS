<div align="center">

<img src="./packages/vscode/assets/icon.png" width="100" alt="Icon" />

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

## 功能 ✨

- 🌹 具备完整的`ArkTS`语言的语法高亮、补全、跳转、诊断等基础功能 (1.x)
- 🎨 ArkTS支持右键一键快速格式化，格式化支持由 `oxk` 工具链提供, 工具链采用 `Rust编写`，由 `oxc project` 项目 Fork 修改而来，速度极快 ⚡️ 独立使用Demo仓库地址: [https://github.com/ohos-rs/oxc-ark](https://github.com/ohos-rs/oxc-ark) 感谢 GitHub @richerfu 大佬的贡献！ (1.2.12+)
- 💿 支持和 `DevEco Studio` 一致的模拟器镜像管理器，支持创建/删除设备以及下载/删除模拟器镜像，由 [@arkts/image-manager](https://github.com/ohosvscode/image-manager) 提供强力支撑 ✊ (1.3.0+)
- 🚀 支持任务 `tasks.json` 和启动配置 `launch.json`，配置后可一键运行 hvigor 任务编译项目，并通过 `hdc` 命令运行或调试到模拟器/真机 (1.3.0+)
- 📦 支持安装和管理`OpenHarmony SDK`，并且支持根据当前打开的项目自动探测`API版本`，发出弹窗提示`下载`或`切换` (1.x)
- ✂️ 支持和`TypeScript`基本一致的`snippets`，并且添加了`Struct Declaration`等`ArkTS`独有的`Snippets`
- 🥇 支持完美的 `$r` 函数补全和跳转、支持 `module.json5` 文件的补全和跳转、`resources/element/` 下所有`json`文件点击查询全局引用；由 Rust 编写的 [@arkts/project-detector](https://github.com/ohosvscode/project-detector) hvigor项目分析器提供强力支撑 ✊ (1.1.6+)
- 🍞 支持 `module.json5` 文件路径补全和跳转、引用表达式错误诊断、`requestPermissions` 权限补全等一系列 new feature ✨ (1.1.8+)
- 🌾 hvigor 资源管理器面板，支持资源限定符文件夹创建、资源引用索引等功能 （基于 `@arkts/project-detector` 项目分析器打造） (1.2.10+)
- 🎨 内置文件图标主题：提供`ArkTS Icons`主题，支持ArkTS文件类型（`.ets`、`.json5`等）和常见Web项目文件（JavaScript、React、CSS、Markdown等），适用于Nx monorepo等混合项目。
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
  - ...未来会支持更多文件的JSON Schema

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

| Key                                      | Description                                                                 | Type      | Default                       |
| ---------------------------------------- | --------------------------------------------------------------------------- | --------- | ----------------------------- |
| `ets.sdkPath`                            | OpenHarmony SDK 路径。每次更改此设置时将会重启 ETS 语言服务器。(此路径对应deveco studio 安装目录下的`sdk/default/openharmony`路径)                                     | `string`  | `""`                          |
| `ets.baseSdkPath`                        | 默认其它版本 OpenHarmony SDK 安装路径路径。所有版本的 SDK 都将安装在此路径下。(此路经对应deveco studio 设置中的 OpenHarmony SDK 位置)                                 | `string`  | `"${os.homedir}/OpenHarmony"` |
| `ets.hmsPath`                            | HMS SDK 路径。因为 HMS SDK 是独立于 OpenHarmony SDK 的，所以需要另外单独设置。一般您可以在 DevEco Studio 安装目录下找到该SDK。(此路径对应deveco studio 安装目录下的`sdk/default/harmony`路径)                                     | `string`  | `""`                          |
| `ets.lspDebugMode`                       | 启用 ETS 语言服务器调试日志。                                | `boolean` | `false`                       |
| `ets.ignoreWorkspaceLocalPropertiesFile` | 忽略从本地工作区 `local.properties` 文件中自动推断基础 SDK 路径。          | `boolean` | `false`                       |
| `ets.linterVersion`                      | The version of the ArkTS linter to use. Set to 'off' to disable the linter. | `string`  | `"1.1"`                       |
| `ets.resourceReferenceDiagnostic`        | 未匹配到的 $r() 资源引用的诊断级别                                                        | `string`  | `"error"`                     |
| `ets.localImagePath`                     | 本地HarmonyOS/OpenHarmony模拟器镜像存放位置。

在 MacOS 下, 默认路径为 `~/Library/Huawei/Sdk`; 在 Windows 下, 默认路径为 `%APPDATA%\Local\Huawei\Sdk`.                              | `string`  | ``                            |
| `ets.imageConfigPath`                    | HarmonyOS 配置文件存放位置。

在 MacOS 下, 默认路径为 `~/Library/Application Support/Huawei/DevEcoStudio6.0`; 在 Windows 下, 默认路径为 `%APPDATA%\Roaming\Huawei\DevEcoStudio6.0`; 在其他平台, 默认路径为 `~/.huawei/DevEcoStudio6.0`.                             | `string`  | ``                            |
| `ets.deployedEmulatorPath`               | 部署的模拟器存放位置。

在 Windows 下, 默认路径为 `%APPDATA%\Local\Huawei\Emulator\deployed`; 在其他平台下, 默认路径为 `~/.huawei/Emulator/deployed`.                        | `string`  | ``                            |
| `ets.emulatorLogPath`                    | 模拟器日志存放位置。

在 MacOS 下, 默认路径为 `~/Library/Logs/Huawei/DevEcoStudio6.0`; 在 Windows 下, 默认路径为 `%APPDATA%\Local\Huawei\DevEcoStudio6.0\log`; 在其他平台, 默认路径为 `~/.huawei/DevEcoStudio6.0/log`.                             | `string`  | ``                            |

<!-- configs -->

## 命令

<!-- commands -->

| Command                                            | Title                                                       |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `ets.restartServer`                                | ETS: 重启 ArkTS 服务器                                |
| `ets.installSDK`                                   | ETS: 安装/切换 OpenHarmony SDK                                   |
| `ets.createProject`                                | ETS: 创建 ArkTS 项目                                |
| `ets.resourceExplorer.refresh`                     | ETS: 刷新 Hvigor 资源管理器                     |
| `ets.resourceExplorer.openFile`                    | ETS: 在编辑器中打开文件                    |
| `ets.resourceExplorer.openResourceQualifierEditor` | ETS: 打开资源限定符编辑器 |
| `ets.openDeviceManager`                            | ETS: 打开设备管理器                            |
| `ets.copyHdcPathToClipboard`                       | ETS: 复制 HDC 路径                       |

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

## 参与开发 👩‍💻

如果你想参与本项目的开发或从源码构建，请查阅 [CONTRIBUTING.md](./CONTRIBUTING.md)。

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

<img src="./screenshots/wechat-pay.JPG" width="200" alt="WeChat" />

<img src="./screenshots/alipay.JPG" width="200" alt="Alipay" />

<img src="./screenshots/qq.JPG" width="200" alt="QQ" />

</div>

## License 📝

[MIT](./LICENSE)
