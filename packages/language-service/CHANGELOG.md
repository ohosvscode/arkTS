# @arkts/language-service

## 1.2.10

### Patch Changes

- [#227](https://github.com/ohosvscode/arkTS/pull/227) [`b400800`](https://github.com/ohosvscode/arkTS/commit/b400800c6b117abeddb5a08884341556ed5d0429) Thanks [@SummerKaze](https://github.com/SummerKaze)! - feat: 添加图片预览功能和 hvigor 资源管理器面板、资源限定符文件夹创建面板

## 1.2.8

### Patch Changes

- [#210](https://github.com/ohosvscode/arkTS/pull/210) [`954c7d4`](https://github.com/ohosvscode/arkTS/commit/954c7d4fd049ff8b5c880d08ffdeb143f2329afc) Thanks [@Groupguanfang](https://github.com/Groupguanfang)! - feat: 关闭 `.d.ets` 的 ArkTS Linter 检查；关闭空文件内容的检查，防止出现无用错误

## 1.1.7

### Patch Changes

- [#208](https://github.com/ohosvscode/arkTS/pull/208) [`7cf5558`](https://github.com/ohosvscode/arkTS/commit/7cf5558d103c70a00e9dfcbc10689bd5bc9e5251) Thanks [@Groupguanfang](https://github.com/Groupguanfang)! - fix(language-server): 修复 module.json5 无跳转问题

## 1.1.6

### Patch Changes

- 3c79c04: fix: 修复 element json file -> module.json5 reference 跳转问题 (#198)
- 2874720: chore: update deps & move the compatible files into scripts folder, update icons using DevEco Studio Next icons (#197)
- Updated dependencies [2874720]
  - @arkts/shared@1.0.11

## 1.1.5

### Patch Changes

- 82444bd: feat: 添加 i18n-ally 插件推荐、添加 ArkTS 模版 (#181)
- Updated dependencies [5583113]
- Updated dependencies [82444bd]
  - @arkts/shared@1.0.10
  - @arkts/types@1.1.3

## 1.1.4

### Patch Changes

- 2fc2eb9: feat(language-service): 添加 module.json5 requestPermissions 部分补全功能
- 9fdbf59: feat: 抽象资源补全为一个 namespace，并添加 module.json5 文件路径补全和跳转、引用表达式错误诊断

## 1.1.3

### Patch Changes

- 1f5690f: feat: 优化资源跳转性能，合并重复代码逻辑

## 1.1.2

### Patch Changes

- f7e47c6: 添加媒体文件夹、profile 文件夹等相关跳转警告 (#167)
- Updated dependencies [f7e47c6]
  - @arkts/shared@1.0.9
  - @arkts/types@1.1.2

## 1.1.1

### Patch Changes

- a69a6d3: perf: 移除`chokidar`监听器，改用 vscode 自带的 FileWatcher (e8ad061898edba6df7fb61be1557586ded9073f4)
- 702f67a: fix: 修复项目分析器缓存系统使其正常工作; 添加文件系统抽象层，使 language-service 可以在浏览器正常工作 (03340761354d2aff82d9ac461409a05084d46a4b)
- c401902: feat: 添加`@arkts/language-service`包，将公共服务抽离进该包 (aba71f4a7be11623dbeb07732d80ae1db1089af8) (#157)
- df97ae7: feat: 添加 OpenHarmonyModule 层级，支持检测 main、ohosTest 等多子模块的情况 (d5c78a3efe217358bf5f7a64960e175bf066a3a3)
- dfda7e8: feat: 添加 json 基础跳转源码检查 (48b47a9ce31fde88aaacd50adb95a8bd631c89a8)
- 828387a: feat: 添加媒体文件夹检查，重构多个 project detector 方法 (442c94f81659c2861d61dd103258f838e6073762)
- e6089b0: feat: 重构使用 @arkts/project-detector 查找资源 (#164)
- 8a29c5a: feat: 调整文件结构，区分文件、文件夹、子模块、模块级项目、工作区级项目、抽象项目等 (38c09f4db569d48f7df032fc160564e37e9cbacb)
- fc4c7b8: feat: 迁移 resource diagnostics 和 definition 到重构后的新服务，并添加 json 为 documentSelector (8740d298767070ca5c0a7af8ff662817f7fe3c6e)
- 19a8a75: 1c8ea58: feat: 添加 string/color 等 element file 在 module.json5 中的跳转功能 (1c8ea586d42547ed98c8b29851af5504d2e02041)
- Updated dependencies [a69a6d3]
- Updated dependencies [c401902]
- Updated dependencies [dfda7e8]
- Updated dependencies [828387a]
- Updated dependencies [e6089b0]
- Updated dependencies [fc4c7b8]
- Updated dependencies [19a8a75]
  - @arkts/shared@1.0.8
  - @arkts/types@1.1.1
