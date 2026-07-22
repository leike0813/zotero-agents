---
name: zotero-librarian
description: 当需要通过 Host Bridge 协调 Zotero 文献库检查、synthesis 上下文、workflow 执行和文献库维护时使用。
license: AGPL-3.0-or-later
---

# Zotero Librarian

使用此 skill 以图书管理员姿态通过 Host Bridge 操作 Zotero 文献库：先检查，保持证据可追溯，仅通过经审查的 mutation 或 workflow 通道执行更改。

## 第一步

1. 在使用 handle、approval、文件、workflow 或 writeback 之前，阅读 `references/control-invariants.md`。
2. 阅读 `references/operating-principles.md` 了解 profile 级别的命令选择和常驻维护姿态。
3. 当请求使用图谱、三件套、digest、references、citation analysis、run handle 或 writeback 等简称时，阅读 `references/terminology.md`。
4. 在准备或提交 workflow 之前，阅读 `references/workflow-execution-policy.md`。
5. 使用 `references/common-tasks.md` 进行常见文献、readiness、synthesis 和 writeback 任务路由。
6. 为当前操作阶段加载一份匹配的生成命令手册。跨 family 的 workflow 在跨越阶段边界时可以加载下一阶段手册；不要预加载无关卡片。使用 `references/workflows.md` 获取生成的 workflow catalog，仅在需要详尽目标检查时使用 `references/host-bridge.md`。
7. 在进行索引、调度、监控、维护或辅助脚本工作之前，阅读下面的常驻参考。
8. 当 Host Bridge 可用性不确定时，检查 `zotero-bridge bridge status`。
9. 当加载的 profile 路径、命令帮助或 CLI 错误提示 surface 不匹配时，将 `zotero-bridge --version` 与 `references/host-bridge.md` 中呈现的预期 CLI 版本进行比较。版本差异仅为建议性质：在执行该命令之前使用 `zotero-bridge <command> --help`。
10. 运行 `zotero-bridge surface identity --json` 并将 CLI schema、构建 fingerprint 和命令 catalog 校验和与 profile release 信封进行比较。当命令可用性、argv、approval、handle、效果或恢复仍不确定时，使用离线的 `surface search` 或 `surface describe`。
11. 在重试 backend 或 profile 敏感操作之前，使用 `zotero-bridge bridge profile inspect`、`zotero-bridge bridge profile diagnose` 和 `zotero-bridge bridge backend ...`。

## 决策规则

- 对于直接文献库事实，使用 `library`。
- 对于缺失 PDF、源 Markdown 或文献分析 artifact 发现，使用 `library readiness`。
- 对于活动 Zotero 窗格、当前选择或到已知 Zotero handle 的 UI 导航，使用 `context`。
- 对于 topic、graph、index、resolver、artifact 或 insight 上下文，使用 `synthesis`。
- 对于可复用的多步骤行为，使用 `workflow describe` 检查 workflow。
- 对于从同一文献库中已有文献对现有 collection 进行范围驱动的策展，提交 Host 拥有的 `collection-collector` workflow 并附带显式 workflow 选项，而不是发出推断的逐条目 collection mutation 或使用无选项的 agent-run 交接。
- 对于草稿 workflow 输入，当就绪状态不确定时，在执行之前使用 `workflow requirements` 或 `workflow validate`。
- 对于 Host 拥有的执行，提交 workflow 并通过 `workflowRunId` 监控返回的 `run`。
- 对于 Agent 拥有的交接，使用 `$zotero-workflow-agent-runner`；将 `agentRunId` 视为 apply-back session handle，完成返回的请求，并使用 `workflow agent-apply` 执行。
- 对于写入操作，使用 preview/apply、mutation 支持的语义命令或 workflow apply-back。在任务记录中保留 preview、已应用结果、上传的 `fileId` 或结果包路径。
- 对于精确的命令区分，加载下面直接链接的命令手册；在任何失败或不确定状态更改之后加载 `references/output-and-recovery.md`。

## 常驻参考

- `references/resident-index.md`：在本地索引发现、刷新、新鲜度决策或实时确认之前阅读。
- `references/scheduled-jobs.md`：在运行或更改任何 cron 拥有的任务之前阅读。
- `references/monitoring-and-notifications.md`：在通知同步、运行注册或运行监视之前阅读。
- `references/workflows.md`：生成的 workflow catalog 事实；本地刷新，然后在执行之前确认实时执行模式。
- `references/workflow-execution-policy.md`：在 Host 拥有的提交或 Agent 拥有的交接之前阅读。
- `references/maintenance-and-recovery.md`：在缓存失效、图指标刷新、索引修复或从部分状态恢复之前阅读。
- `references/profile-script-contracts.md`：在调用任何 profile 辅助脚本之前阅读。
- `references/library-maintenance.md`：常驻分诊、卫生和关注队列策略。

## 命令手册

- `references/commands/connectivity-context.md`：identity、bridge/profile/backend 检查、上下文和导航。
- `references/commands/library-items.md`：文献库搜索、确定性分页、条目详情、笔记和附件。
- `references/commands/library-notes-attachments-readiness.md`：笔记 payload、annotation、readiness 和 snapshot 页面。
- `references/commands/workflows-and-runs.md`：workflow 模式、提交/交接/apply、运行监控、permission 和交互。
- `references/commands/mutations-files-products.md`：具体写入、注册文件和 Dashboard Product。
- `references/commands/synthesis-topics-artifacts.md`：topic、artifact、concept 和 schema。
- `references/commands/synthesis-graph.md`：graph 视图和维护区分。
- `references/commands/synthesis-index-resolver-insights.md`：派生索引、resolver、关注队列和缓存状态。
- `references/commands/diagnostics.md`：常规诊断之后的仅限调试的升级。

## 上下文处理

在对"这篇论文"、"所选笔记"、"当前 collection"或"带我到那个条目"等短语执行操作之前，使用 `context current` 或 `context selection get`。仅在 Zotero 或 Host Bridge 返回的 handle 上使用 `context item open`、`context note open`、`context collection open` 或 `context selection open`。

上下文导航更改 Zotero 显示或选择的内容。它不是 mutation 通道，也不授权 metadata、note、tag 或文件更改。

## Writeback 处理

对于 tag、collection、item field、note、payload 和 attachment 更改，先检查目标，然后使用 `mutation` 命令。在通过 `file upload` 附加本地 artifact 之前，使用 `mutation item attach-file` 上传它们。使用 `library annotation ...` 命令进行 annotation 读取和导出；annotation 写入不属于此 surface。

## 运行处理

使用 `run active` 获取当前正在运行、等待或可恢复失败的 Host 拥有任务的轻量视图。当需要回调式生命周期事件时使用 `run notification list`。使用 profile 通知同步脚本进行定时监控。当需要特定 workflow 运行的 skill-run 明细时使用 `run get <workflowRunId>`。

使用 `run recent`、`run workflow recent`、`run skill recent` 和 `run skill events` 获取轻量级历史记录和生命周期/进度事实。这些命令不是 transcript 访问，也不暗示交互目标。

使用 `run permission pending` 和 `run permission get` 检查 approval 状态。CLI 不批准或拒绝 permission 请求。

交互操作需要 `skillRunId`：

```powershell
zotero-bridge run skill reply <skillRunId> --message "..."
zotero-bridge run skill connect <skillRunId>
zotero-bridge run notification ack --event <eventId>
```

## 输出纪律

报告结果时，包含支持答案的 Zotero item key、topic ID、workflow ID、run handle、artifact 路径或文件句柄下载。如果命令失败，报告结构化错误代码和下一个安全操作。

## 维护处理

使用 `synthesis cache status` 和 `synthesis index status` 进行只读维护诊断。将 `synthesis cache refresh-reference-sidecar` 和 `synthesis graph update` 作为单独的 approval 门控操作运行，保留两个操作 id，永远不要将 sidecar 完成视为 graph 完成。仅对支持的作用域使用 `synthesis cache invalidate`。将 citation graph 指标修复保持在 `synthesis graph refresh-metrics` 上。

使用 `scripts/zotero_librarian_notification_service.py sync` 进行非阻塞通知收件箱刷新。不要从 cron 或 Agent 循环中运行长轮询等待。
