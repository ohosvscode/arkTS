---
"@arkts/language-server": patch
"vscode-naily-ets": patch
---

feat: 修复多项问题:

- perf: 语义 `patch` 性能问题 (packages/language-server/src/patches/patch-semantic.ts)
- feat: 添加 `tsconfig.json` 的下列选项: (packages/vscode/schemas/ets-tsconfig.schema.json)
  - `etsAnnotationsEnable`
  - `compatibleSdkVersion`
  - `packageManagerType`
  - `compatibleSdkVersionStage`
  - `etsLoaderPath`
- feat: 添加创建项目时选择卡片的倾斜效果 (packages/vscode/src/project/components/project-choice.vue)
