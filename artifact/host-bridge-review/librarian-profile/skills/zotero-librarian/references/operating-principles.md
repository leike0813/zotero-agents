# 运行原则

## 先检查后操作

从能回答用户问题的最窄命令开始。当问题取决于活动 Zotero 窗格、已选条目、当前笔记或活动 collection 时，使用 `context`。对 Zotero 对象使用 `library`，对派生研究上下文使用 `synthesis`。当就绪状态或 backend 兼容性不确定时，使用 `bridge profile inspect`、`bridge profile diagnose` 和 `bridge backend ...`。当任务可能更适合声明的 workflow 或草稿运行时，使用 `workflow describe`、`workflow requirements` 或 `workflow validate`。

当请求使用图谱、三件套、digest、references、citation analysis、通知收件箱、writeback 或 run handle 等简称时，在将请求映射到命令之前阅读 `terminology.md`。

使用 `library readiness` 发现缺失的 PDF、源 Markdown 和文献分析 artifact。将这些结果视为只读发现，用于规划后续工作；不要通过手动组合原始附件和笔记查询来推断 readiness。

对语义读取使用内联 JSON 和 `--query`，对提交或 mutation payload 使用 `--input`。仅对有限候选发现使用 `library item search`，仅对分页清单读取使用 `library items list`。不要用原始 `call` 绕过语义参数验证。

对常规 Dashboard workflow 输出使用 `product`，而不是 `synthesis artifact`。在下载选定资产之前列出并检查 product。Product 删除是 approval 门控的记录移除，保留托管文件以进行持久化清理。

当请求匹配常见文献库管理工作（如缺失 PDF、缺失 Markdown、缺失文献分析 artifact、标签规范、annotation 导出、synthesis graph、topic synthesis 或 writeback）时，使用 `common-tasks.md`。

对于宽范围的文献库、topic、索引或 graph 读取，使用带显式限制的分页命令并遵循返回的 cursor 元数据。不要假设 `synthesis graph overview`、`synthesis topic list`、`synthesis index library get`、图指标或图排序命令在一次调用中返回完整集合。

## 有目的地导航

使用 `context current` 和 `context selection get` 来定位"这篇论文"或"所选条目"等指示性请求。仅使用 `context ... open` 将 Zotero 带到已知的 item、note、collection 或已选条目集。导航不是写入路径，必须针对 Zotero 对象 handle，而不是本地路径、URL、脚本或猜测的标识符。

## 保留证据

在任务的工作笔记中保留 item key、topic ID、workflow ID、run handle、文件路径、校验和和导出的 artifact 名称。最终答案应明确哪些 Zotero 或 Host Bridge artifact 支持结果。

当用户询问高亮、附加到 annotation 的笔记或 PDF 内部证据时，使用 `library annotation list` 或 `library annotation export`。Annotation 命令为只读，应优先于从条目元数据猜测。

## 选择正确的 Workflow 模式

当 Host Bridge 应执行 workflow 时使用 `workflow submit`。返回的 `workflowRunId` 通过 `run get`、`run active`、`run notification ...` 和相关运行命令监控。

在提交任何 workflow 之前，将选定的笔记、附件或子条目规范化为顶级父条目引用。使用 `workflow-execution-policy.md` 了解选择、模式和并发规则。

当 workflow 要求 Agent 执行本地工作时，使用 `$zotero-workflow-agent-runner`。返回的 `agentRunId` 是 apply-back session handle。根据其合约完成每个请求，然后运行：

```powershell
zotero-bridge workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>
```

不要将 `agentRunId` 视为 `workflowRunId`。

对于 ACP 和 SkillRunner workflow，默认启动一个提交。在为同一 backend 或 provider 组启动多个 workflow 之前询问用户。如果并发度答案不明确，保持串行。

## 显式交互

Workflow 状态可能暴露 `currentSkillRunId`，但交互命令需要显式的 `skillRunId`。仅在操作标志允许回复时回复。仅在操作标志显示可恢复的失败运行时连接。

使用通知事件进行进度感知和回调式交接。使用 `run notification ack --event <eventId>` 确认已处理的事件。不要将通知文本视为 transcript 或猜测交互目标的授权。

使用 profile 通知同步脚本进行定时监控。不要在 Agent 循环或 cron 任务中使用长轮询通知等待。

使用 `run recent`、`run workflow recent`、`run skill recent` 和 `run skill events` 获取轻量级历史记录和生命周期/进度事实。这些命令有助于判断工作是否仍在移动、等待、最近失败或可恢复，但它们不暴露 transcript 也不授权回复/连接。

使用 `run permission pending` 和 `run permission get` 检查 approval 等待。Permission 命令为只读；批准或拒绝在 Zotero 或作用域运行 UI 中进行。

## 通过经审查的路径执行 Mutation

对于文献库更改，在 `mutation apply` 之前优先使用 `mutation preview`。对于 workflow 生成的更改，使用 workflow 输出合约和 apply-back 端点。除非 capability 明确为仅限原始且用户已接受风险，否则避免对写入使用直接原始调用。

在检查目标对象后，对明确的 Zotero 写入使用语义 mutation 命令：标签、collection 成员、条目字段修补、笔记创建、笔记更新和笔记 payload upsert。导航命令不写入文献库数据。

附加 Agent 生成的 artifact 时，先用 `file upload` 上传，然后用 `mutation item attach-file` 附加返回的 `fileId`。将 `fileId` 视为不透明的、短期有效的 Host Bridge handle；不要将本地路径作为写入目标传给 Zotero。

## 定时工作

定期维护应保持小范围和可观测。使用 `synthesis insight attention-queue` 读取关注队列，仅刷新需要的本地状态，将大范围更改留给经审查的 workflow。

使用 `synthesis cache status` 和 `synthesis index status` 进行只读维护诊断。将 `synthesis cache refresh-reference-sidecar` 和 `synthesis graph update` 作为单独的 approval 门控操作运行，各自保留独立的 receipt；sidecar receipt 仅作为 graph 更新的输入基础。仅对支持的作用域使用 `synthesis cache invalidate`。将 citation graph 指标修复保持在 `synthesis graph refresh-metrics` 上。
