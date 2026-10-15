# Tasks

本清单补记本轮已完成的实现。自动化结果来自 2026-10-15 的实际执行。

## 1. 翻译取消按正常跳过处理

- [x] 1.1 先补回归：结果为 `status: "cancelled"`、产物路径为 null 时，`executeApplyResult` 必须返回跳过结果，且不读取产物、不新增附件、无 hook 错误日志；修复前稳定复现 `output_path is unavailable`。
- [x] 1.2 在 apply hook 读取结果后按结构化状态分流，返回 `ok: true`、`applied: false`、`skipped: true` 并保留原因与 skill diagnostics；`failed` 与缺失产物路径保持原错误处理。
- [x] 1.3 运行 `tests/workflow-literature-translator/160-workflow-literature-translator.test.ts` 与 `tests/workflow-literature-deep-reading/158-workflow-literature-deep-reading.test.ts`，实际结果 **31 passing**。

## 2. 深读 Host 请求契约

- [x] 2.1 删除引用索引请求中的 `referenceSourceRefs` 和 `artifactCoverage`，保留 `sourceRefs`、`includeReferences`、`limit` 与翻页 `cursor`。
- [x] 2.2 将切片请求的低信号选项移入 `filters.includeLowSignal`，并在切片加 filters 之前独立构造布局请求，保持其顶层 `includeLowSignal`。
- [x] 2.3 将 `skills_src` 与 `skills_builtin` 两处 context schema、runtime 校验和规范化上限统一为 100 节点、200 边，默认 80/160 不变；超限在提交阶段拒绝。
- [x] 2.4 确认 `skills_src` 与 `skills_builtin` 的 runtime 脚本与 context schema 逐字节一致。

## 3. 回归与集成验证

- [x] 3.1 扩展深读 bootstrap 上下文用例：把实际产生的引用索引、图切片与布局请求交给生产 `rebuildSynthesisProtocolCapabilityDto` 校验，并断言切片与布局的低信号选项位置；修复前稳定报 `invalid_request`。
- [x] 3.2 新增容量上限用例：101 节点与 201 边在提交阶段被拒绝，且不发出任何 Host 请求；两份 context schema 同时拒绝超限输入。
- [x] 3.3 运行定点用例 `submits context requests and collects Host Bridge graph layout and reference digests` 与 `rejects graph context requests above Host limits`，实际结果 **2 passing**。
- [x] 3.4 运行完整 `tests/tooling/157-literature-deep-reading-bootstrap.test.ts`，实际结果 **20 passing / 3 failing**，三项失败均为环境阻塞，见 Validation boundaries。
- [x] 3.5 运行 `tests/skillrunner/154-skillrunner-sequence-runtime.test.ts` 与 `tests/workflows/88-workflow-runtime-scope-diagnostics.test.ts` 的相关用例，实际结果 **10 passing**，覆盖非阻塞 apply 失败与 hook 诊断日志。
- [x] 3.6 运行 `tsc --noEmit`、改动 TS 文件的 ESLint、改动文件 Prettier check 与 `git diff --check`；全部通过。

## 4. OpenSpec 记录

- [x] 4.1 同步主规格 `literature-workbench-workflows` 与 `literature-deep-reading-skill` 的新增场景。
- [x] 4.2 补齐本 change 的 proposal、design 与两份 spec delta；delta 中的 requirement 逐字复制主规格当前内容。
- [x] 4.3 运行 `openspec validate fix-deep-reading-cancelled-translation-and-synthesis-requests --strict`，确认全部规划工件存在并通过校验。

## Validation boundaries

- 完整 bootstrap 用例中的 3 项失败与本次改动无关：1 项为 esbuild 无法写入被映射占用的 `citation-graph-standalone.js`，2 项为缺少 Playwright `chromium_headless_shell-1223`（本地仅有 1243）。
- 未运行插件 build、XPI 安装、Zotero 实机验收、发布或 Git 提交；当前 Zotero 中运行的仍是修改前的插件。
- 未新增真实 Zotero E2E；实机 toast、runtime log 与引用层产出仍需宿主验证。

## Workflow follow-up

- 审阅 change 后按需归档；主规格已同步本轮新增场景，归档时核对该状态。
- 需要宿主交付证据时，按项目 build preflight 与隔离 Zotero 验收流程执行。
