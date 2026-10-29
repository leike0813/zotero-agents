# Proposal

## Why

文献深度阅读一次运行产生了两类用户可见的错误。第一步 `literature-translator` 在源语言与目标语言相同时按 Skill 契约返回 `status: "cancelled"`，这是正常终止；但 apply hook 仍按成功路径读取产物，因 `output_path` 为 null 抛出 `output_path is unavailable`，写入 error 级 runtime log 并弹出错误 toast。同时该次运行在 Stage 10 通过 Host Bridge 收集引用与引用图时，请求字段已偏离生产协议契约：引用索引多发 `referenceSourceRefs` 和 `artifactCoverage`，图切片把 `includeLowSignal` 放在顶层而非 `filters` 内；宿主侧生产 Schema 校验以 `invalid_request` 拒绝这些请求，Synthesis 界面虽无报错，runtime log 中仍留下失败记录，引用上下文与引用图整体缺失，直接影响深读成品的引用层质量。

## What Changes

- translator apply hook 识别结构化 `status: "cancelled"`，返回 `ok: true`、`applied: false`、`skipped: true`，保留取消原因与 skill diagnostics，不读写任何翻译产物，也不产生 hook 错误日志。
- 引用索引请求只发送 `sourceRefs`、`includeReferences`、`limit`，翻页时附带 `cursor`。
- 图切片请求把低信号选择移入 `filters.includeLowSignal`；布局请求独立构造，保持其契约要求的顶层 `includeLowSignal`，不再由切片请求直接复制。
- 深读 context schema、runtime 校验与规范化上限统一为 100 个节点、200 条边，默认值保持 80/160；超限在提交阶段拒绝，不发出 Host 读取请求。
- 保持生产 Synthesis 协议、Rust sidecar 和页面接口不变；回归测试改为用生产 Schema 校验 Python runtime 实际发出的请求。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `literature-workbench-workflows`：深度阅读级联应用增加翻译取消的正常跳过语义。
- `literature-deep-reading-skill`：Stage 10 Host 上下文收集增加图容量上限和引用/图请求的契约约束。

## Impact

- 工作流包 hook：`workflows_builtin/literature-workbench-package/literature-translator/hooks/applyResult.mjs`。
- 内置 Skill：`skills_src/literature-deep-reading/runtime/deep_reading_runtime.py` 与 `assets/schemas/context-request.schema.json`，并同步 `skills_builtin/literature-deep-reading/` 下的生成文件。
- 既有测试：`tests/workflow-literature-translator/160-workflow-literature-translator.test.ts`、`tests/tooling/157-literature-deep-reading-bootstrap.test.ts`。
- 主规格 `openspec/specs/literature-workbench-workflows/spec.md` 与 `openspec/specs/literature-deep-reading-skill/spec.md` 已同步本轮新增内容；delta 保留相对于修复前规格的增量。
- 不新增依赖，不修改后端 API、Synthesis 协议契约或 Rust 运行时。

本 change 补记已完成的实现与规格变更。构建、实机验收、提交与归档另行执行。
