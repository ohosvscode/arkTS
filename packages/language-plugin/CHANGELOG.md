# @arkts/language-plugin

## 1.3.3

### Patch Changes

- [#280](https://github.com/ohosvscode/arkTS/pull/280) [`83af946`](https://github.com/ohosvscode/arkTS/commit/83af94609ec51eb32bf78a2be4332cf3591e8038) Thanks [@Groupguanfang](https://github.com/Groupguanfang)! - feat: #271

## 1.2.8

### Patch Changes

- [#213](https://github.com/ohosvscode/arkTS/pull/213) [`1fdfcd3`](https://github.com/ohosvscode/arkTS/commit/1fdfcd35e1557783435c01f7ff63a88029607db5) Thanks [@Groupguanfang](https://github.com/Groupguanfang)! - feat: 使 patch Annotation 语义高亮更精确；添加 `OpenHarmony SDK` 的 `defaultLibrary` 语义高亮

## 1.1.6

### Patch Changes

- 82444bd: feat: 添加 i18n-ally 插件推荐、添加 ArkTS 模版 (#181)

## 1.1.5

### Patch Changes

- f7e47c6: 添加媒体文件夹、profile 文件夹等相关跳转警告 (#167)

## 1.1.4

### Patch Changes

- a69a6d3: perf: 移除`chokidar`监听器，改用 vscode 自带的 FileWatcher (e8ad061898edba6df7fb61be1557586ded9073f4)
- c401902: feat: 添加`@arkts/language-service`包，将公共服务抽离进该包 (aba71f4a7be11623dbeb07732d80ae1db1089af8) (#157)
- dfda7e8: feat: 添加 json 基础跳转源码检查 (48b47a9ce31fde88aaacd50adb95a8bd631c89a8)
- 828387a: feat: 添加媒体文件夹检查，重构多个 project detector 方法 (442c94f81659c2861d61dd103258f838e6073762)
- e6089b0: feat: 重构使用 @arkts/project-detector 查找资源 (#164)
- fc4c7b8: feat: 迁移 resource diagnostics 和 definition 到重构后的新服务，并添加 json 为 documentSelector (8740d298767070ca5c0a7af8ff662817f7fe3c6e)
- 19a8a75: 1c8ea58: feat: 添加 string/color 等 element file 在 module.json5 中的跳转功能 (1c8ea586d42547ed98c8b29851af5504d2e02041)

## 1.1.3

### Patch Changes

- 9737adc: fix: 替换不安全的`new Function()`, 改为 createRequire 加载 SDK 中的`sysResource.js`

## 1.1.2

### Patch Changes

- be25ace: feat: 支持$r()资源引用补全 (#6) 感谢 github @frezs 的贡献 🎉!

## 1.1.1

### Patch Changes

- 7c47b93: Fixes issue #130 by correcting the argument order in affected functions, ensuring that parameters are passed in the expected sequence. This resolves errors related to incorrect argument handling.

## 1.1.0

### Minor Changes

- e8fcbef: feat: 添加`$this`语法支持 (#122)

## 1.0.6

### Patch Changes

- 915e262: ci: release

## 1.0.5

### Patch Changes

- 66c21bd: chore: update deps

## 1.0.4

### Patch Changes

- df60843: feat: 移除 hilog 相关逻辑等待后续实现；还原并增强猜测 SDK 版本功能

## 1.0.3

### Patch Changes

- b9a93ed: feat: 添加\`hms\`SDK 支持 (#35)

## 1.0.2

### Patch Changes

- [`f650268`](https://github.com/Groupguanfang/arkTS/commit/f650268cbad8ca60873f9fbb8cf3d20e48873739) Thanks [@Groupguanfang](https://github.com/Groupguanfang)! - fix: windows 下路径问题

## 1.0.1

### Patch Changes

- [`19428dc`](https://github.com/Groupguanfang/arkTS/commit/19428dcdb6f8e27914067ea48a53ce644c26f7e6) Thanks [@Groupguanfang](https://github.com/Groupguanfang)! - feat: 添加多模块支持
