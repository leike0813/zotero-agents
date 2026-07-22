# Workflow 执行策略

在准备或提交 workflow 之前使用此参考。

## 选择

Workflow 提交使用显式选择。当用户说"这篇论文"、"所选条目"或"当前 collection"时，读取 Zotero 上下文，然后在提交之前将笔记、附件和子条目 handle 规范化为顶级父条目引用。仅对合约接受无选择模式的 workflow 使用无选择模式。

使用：

```powershell
scripts/zotero_librarian_workflow_service.py parent-selection --from-context
scripts/zotero_librarian_workflow_service.py parent-selection --items .\items.json
```

## Provider 运行时 Profile

Provider 是运行时族；backend 是通过 `backendId` 选择的已配置具体实例；provider profile 是与 workflow 无关的 backend 选择加上非敏感的 provider 特定选项。使用 `workflow profile list|describe|validate` 发现和验证它，不需要 workflow id。独立发现和验证 workflow 选择/选项。只有 `workflow submit` 才会组合两个合约并检查兼容性；Host Bridge 不保存命名的 profile。

常驻进程可以设置 `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE` 为内联 JSON 或 `@` 加绝对 profile 路径。显式的 `--provider-profile`（包括 `{}`）优先。将其视为进程配置：不要声称 Zotero 持久化了它，不要在日志中打印其内容，不要将其应用于 `workflow agent-run`。

对于预授权的 ACP workflow，通过 workflow provider profile 提交 `{"providerOptions":{"autoApproveAcpPermissions":true}}`。这仅控制该运行的 ACP backend 工具权限处理。它不是 Zotero 写入 approval、`autoApproveZoteroWrites`，也不是对待处理 permission 请求的直接操作。

## 模式选择

使用 `workflow describe` 或 `workflow requirements` 返回的结构化 `executionModes`；不要从 workflow 名称、provider 或本地文档推断支持。

当 Host Bridge 或 backend 应拥有执行并暴露 `workflowRunId` 时，使用 Host 拥有的 `workflow submit`。

仅当 `executionModes.agentOwned.supported` 为 true 时使用 `$zotero-workflow-agent-runner`。`workflow agent-run` 无法提供 workflow 选项或 provider profile。返回的 `agentRunId` 是 apply-back session handle，不是运行控制 handle。

在中断或失败的 apply-back 之后，查询 `workflow agent-apply-status <agentRunId>` 并遵循 receipt。不要重用已消费的 handle。

## 并发度

ACP 和 SkillRunner backend 可能有模型/provider 并发限制。默认每次调用启动一个提交。在为同一 backend 或 provider 组启动多个 workflow 之前，询问用户并发度数。如果答案不明确，保持并发度为 1。

辅助脚本强制执行此默认值：

```powershell
scripts/zotero_librarian_workflow_service.py submit --plan .\plan.json
```

仅在确认后使用更高的启动计数：

```powershell
scripts/zotero_librarian_workflow_service.py submit --plan .\plan.json --concurrency 2 --confirm-concurrency
```

## 监控

对于 Host 拥有的运行，存储返回的 `workflowRunId` 值并使用简短检查：

```powershell
scripts/zotero_librarian_notification_service.py sync
scripts/zotero_librarian_notification_service.py inbox
zotero-bridge run get <workflowRunId>
zotero-bridge run skill events <skillRunId> --limit 20
```

不要在 Agent 循环或定时任务中使用长轮询通知等待。通知同步读取收件箱后返回。
