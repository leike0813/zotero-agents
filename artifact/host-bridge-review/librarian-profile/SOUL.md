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
6. 加载 `references/commands/` 下恰好一个匹配的生成命令手册；使用 `references/workflows.md` 获取生成的 workflow catalog，仅在需要详尽目标检查时使用 `references/host-bridge.md`。
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
- 对于 Host 拥有的执行，提交 workflow 并通过 `run` 监控返回的 `workflowRunId`。
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

对于 tag、collection、item field、note、payload 和 attachment 更改，先检查目标，然后使用 `mutation` 命令。在通过 `mutation item attach-file` 附加本地 artifact 之前，使用 `file upload` 上传它们。使用 `library annotation ...` 命令进行 annotation 读取和导出；annotation 写入不属于此 surface。

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


# 常见任务手册

使用此参考将常见的 Zotero 图书管理员请求映射到命令路径。

## 有序研究生命周期

对于完整的研究流程，保留以下顺序和每个 mutation 阶段的 receipt：

1. `literature-search-ingest`：发现、审查、去重和摄入文献；保留成功的父条目引用和来源。
2. `literature-analysis`：为这些引用生成 digest、references 和 citation-analysis artifact；仅传递成功的引用。
3. `synthesis cache refresh-reference-sidecar`：为已提交的文献范围启动单独批准的 sidecar 操作并轮询其操作 id；保留参考基础哈希和任何部分失败。
4. `synthesis graph update`：请求新的 approval，传递预期的参考基础哈希，并轮询不同的操作 id。不要将其与 sidecar 刷新合并。
5. `create-topic-synthesis` 或 `update-topic-synthesis`：根据 topic 是否存在选择，独立验证 workflow 和 provider 合约，然后确认生成的 topic 报告。
6. `export-research-bundle`：仅在目标 artifact 和 topic 为最新状态后才导出；验证 Product 和下载的包。

定时流程可以识别或报告需要 mutation 的阶段，但在没有当前经审查请求的情况下，不会重用 approval、提交 workflow、刷新 sidecar 状态、更新 graph 或应用结果。从第一个缺少稳定证据的阶段恢复，而不是盲目重放序列。

## 缺失输入和 Artifact

- 缺失 PDF：`zotero-bridge library readiness missing-pdf --query <JSON_OR_FILE>`。
- 缺失源 Markdown：`zotero-bridge library readiness missing-markdown --query <JSON_OR_FILE>`。
- 缺失文献分析三件套：`zotero-bridge library readiness missing-analysis --query <JSON_OR_FILE>`。

使用 readiness 结果进行规划。它们不会获取 PDF、转换 Markdown 或运行分析。

## 文献搜索与摄入

对于主要由查询驱动且对当前 Zotero 选择依赖较弱的搜索或摄入请求，当交接合约明确时，优先使用 `$zotero-workflow-agent-runner` 和 `literature-search-ingest`。如果用户需要 Host Bridge/backend 执行和运行监控，使用 Host 拥有的 `workflow submit`。

## 文献分析

对于已选论文或 readiness 修复列表，先规范化为父条目引用。使用 `literature-analysis` 处理缺失的 digest、references 和 citation-analysis artifact。默认启动一个 backend 提交，除非用户确认并发度。

## 标签与元数据

当请求的行为是 workflow 级别的标签规范化任务时，使用 `tag-regulator`。仅当请求的标签操作已经具体且不需要语义推断时，才使用 `mutation tag ...`。

## Annotation 与证据

对于 PDF 高亮和阅读器 annotation，使用 `library annotation list` 或 `library annotation export`。Annotation 命令为只读。

对于笔记，使用 `library note get` 读取笔记对象，使用 `library note payloads` 枚举结构化 payload，使用 `library note payload` 获取单个 payload。在证据中保持附件记录、注册的 `fileId` 值、Product handle 和本地路径的区分。

## Synthesis Graph 与 Topic

对于 citation graph 请求使用 `synthesis graph ...`，对于 topic synthesis 请求使用 `synthesis topic ...`。仅在任务要求创建或更新 synthesis artifact 时使用 workflow 命令。

使用 `synthesis index` 获取派生索引页面，`synthesis resolver` 进行有界的 tag/collection/paper-ref 解析，`synthesis artifact` 获取论文拥有的分析文件，`synthesis concept` 或 `synthesis schema` 获取类型化语义模型，`synthesis insight attention-queue` 获取排序的审查工作。

Reference-sidecar 刷新和 citation-graph 更新是独立的异步维护控制。每个都需要自己的 Zotero approval 并返回自己的操作 id。使用 `synthesis cache status --operation-id <id>` 轮询；在请求 graph 更新时使用 sidecar receipt 的基础哈希。

## Writeback

对于 Zotero 写入，使用 mutation preview/apply 或 mutation 支持的语义命令。仅在 workflow 交接或结果合约要求时使用 workflow apply-back。

对于生成的附件，保留选定的父 `itemRef`、上传校验和和 `fileId`、mutation approval 结果以及刷新的附件记录。对于 Dashboard 输出，使用 `product list|get|download`；不要用 workflow 运行或文件句柄替代 `productId`。

## 运行时与恢复

保持 `workflowRunId`、`skillRunId`、`permissionRequestId`、通知 `eventId`、`agentRunId` 和 `agentRequestId` 的区分。在不确定的 apply-back 之后，读取 `workflow agent-apply-status`。在任何结构化失败之后，加载 `output-and-recovery.md` 并仅遵循与报告的状态更改和 handle 消费字段兼容的安全操作。
