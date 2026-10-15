# Tasks

本清单补记本轮已完成的实现。自动化结果来自 2026-10-15 的实际执行；补建 change 不重新运行未修改的业务代码测试。

## 1. 共享提交反馈与 bridge

- [x] 1.1 实现按 source/owner 隔离、复用 actionId 的本地占位与防重；以 `tests/acp/97-acp-ui-smoke.test.ts` 的三来源即时显示、重复点击和快捷键用例验证。
- [x] 1.2 让 Shell 返回真实宿主结果，接纳时释放共享准入并保护后续权限交互；以 `tests/acp/184-assistant-workspace-publication-data-plane.test.ts` 的运行中权限路由用例验证。
- [x] 1.3 按正式条目身份合并回声，保留失败行与草稿，隔离迟到结果；以 97 的早晚轮次关联、owner 切换和失败后分页用例验证。
- [x] 1.4 更新 Workspace 文档、共享 wire DTO、项目 UI 约束和 11 种语言的 submitting 提示；核对文档与实现，并通过改动文件格式检查。

## 2. 三来源运行时收敛

- [x] 2.1 将 ACP Chat 准入保护提前到会话准备与 hydrate 之前，关联正式用户行，分开提交失败与后续执行错误；通过 `tests/acp/96-*.test.ts` 验证会话、权限及 transcript 行为。
- [x] 2.2 让 ACP Skills submitted/accepted 压过旧 waiting，失败释放提交态，新 pending 开启下一轮并统一用户行关联；通过 `tests/acp/167-acp-skills-concurrent-submission.test.ts` 和 `tests/skillrunner/107-acp-skillrunner-compatible-runner.test.ts`，并更新 ACP Skills 状态机文档。
- [x] 2.3 为 SkillRunner 文本、选项和文件统一提交保护、接纳后序号回声关联和失败处理；通过 `tests/skillrunner/71-skillrunner-run-dialog-ui-e2e-alignment.test.ts` 与 `tests/skillrunner/193-skillrunner-workspace-surface.test.ts`，保留 auto-reply 与 answeredInteractionId 语义。
- [x] 2.4 处理文件选择取消、安全文件名摘要和认证方法路由；复用 107 的文件选择取消/校验用例，以及 97、193 的认证控件与秘密不回声用例验证。

## 3. 渲染与集成验证

- [x] 3.1 保持 hint/reply/transcript 局部更新、无关区域与既有行的 DOM identity，以及 owner-first/page-first 行为；通过 ACP UI/publication 和 `tests/assistant/*.test.ts` 的区域隔离测试验证。
- [x] 3.2 运行合并 Mocha 回归：ACP 96 系列、167、184、97、Assistant 全域、SkillRunner 107/71/193、tooling 159；实际结果为 **643 passing**。
- [x] 3.3 运行 `npx tsc --noEmit -p tsconfig.json`、`npx tsc --noEmit -p tsconfig.sidebar.json`、改动 TS/JS 的 ESLint、改动文件 Prettier check 和 `git diff --check`；全部通过。

## 4. OpenSpec 记录

- [x] 4.1 补齐 proposal、design 和 `assistant-shell-interaction-bridge` delta；核对 delta 中新增 requirement 与主规格本轮新增块完全一致。
- [x] 4.2 运行 `openspec validate fix-assistant-reply-submission-feedback --strict`，确认全部规划工件存在并通过校验。

## Validation boundaries

- 未运行插件 build、Zotero 实机验收、发布或 Git 提交；原生文件选择器、真实 IPC 和滚动体验仍需宿主验证。
- 扩大 ACP 域检查出现未修改区域的失败：100 的 fake npx 子进程、178 的 Windows 文件权限断言、249 的 fixture evidence 文件缺失。
- 扩大 SkillRunner 域检查中 73a 的卸载用例超时，单独复跑通过；本次相关合并回归通过不等于完整测试域全绿。
- 多语言治理检查存在原有 `workflow-settings-acp-cache-refresh-needed` 缺键；本次 `assistant-panel-reply-submitting` 已覆盖全部 11 种语言。

## Workflow follow-up

- 审阅 change 后按需归档；主规格中的本轮新增 requirement 已同步，归档时核对该状态。
- 需要宿主交付证据时，按项目 build preflight 与隔离 Zotero 验收流程执行。
