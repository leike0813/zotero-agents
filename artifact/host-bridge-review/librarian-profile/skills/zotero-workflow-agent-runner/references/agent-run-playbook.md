# Agent-Run 手册

在选择 `workflow agent-run` 之后使用此手册。

## 选择 Agent 拥有的执行

当 workflow 为本地 Agent 工作准备交接、请求不需要 backend 队列所有权、且用户期望 Agent 直接完成工作时，使用 Agent 拥有的执行。好的候选包括 workflow 级别的输入、搜索或摄入准备，以及输出可在 apply-back 之前本地检查的任务。

当 backend 应拥有执行、workflow 需要 backend 运行时状态、或进度应作为 `workflowRunId` 跟踪时，使用 Host 拥有的 `workflow submit`。

## 执行交接

1. 读取实时的 `workflow describe` 或 `workflow requirements`；要求 `executionModes.agentOwned.supported=true` 并记录不选择 Host 拥有执行的原因。
2. 将子引用规范化为顶级父引用，并使用 `zotero_librarian_workflow_service.py plan --mode agent` 构建计划。Agent 模式无法携带 workflow 选项或 provider profile。
3. 使用 `zotero_librarian_workflow_service.py submit --plan <plan.json>` 提交计划，并保留 `agentRunId`、请求 id、包路径和校验和。
4. 打开每个下载的交接包。在执行工作之前，读取请求上下文、请求的 skill/任务、输入 artifact、输出 schema、必需文件名和 apply-back 规则。
5. 独立完成每个请求。在组装结果包之前验证输出 JSON 和引用文件；永远不要编造合约中不存在的字段或文件名。
6. 预检完整的请求到包映射。不要仅因为另一个请求成功就以无效的包启动 apply-back。
7. 仅当所有提交的包都已最终确定时，运行 `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath> ...`。
8. 保留返回的每个请求的 receipt，并实时确认任何声称已写入的 Zotero 对象。

## 处理输出

在任务笔记中保留 `agentRunId`、`agentRequestId`、交接包路径、结果包路径和任何生成的 artifact 校验和。如果输出合约不明确或缺失，停止并报告结构化错误，而不是编造包布局。

交接包是输入证据；结果包是提议的输出；apply receipt 是 writeback 证据。它们都不能与 `workflowRunId`、`skillRunId`、Product 或注册的 `fileId` 互换。

## Apply 失败与 Receipt 恢复

包预检在 approval 之前和消费 apply handle 之前进行。预检失败会使所有请求保持未应用状态；修正命名的包，并仅在错误表明 handle 仍可用时重新提交完整的映射。

一旦 apply 执行开始，将 `agentRunId` 视为一次性使用。如果响应被中断或包含混合的每个请求结果，运行：

```sh
zotero-bridge workflow agent-apply-status <agentRunId>
```

使用持久化的 receipt 作为 `applied`、`failed`、状态更改、消费和可恢复性的唯一权威来源。不要重新运行本地已完成的工作或重新提交标记为已应用的结果。如果恢复需要新的交接，创建新的 Agent 运行，而不是重用已消费的 id。

## 边界

Agent 拥有的交接不是 Host 拥有的运行。它们不出现在 `run active` 中，不能用 `run cancel` 取消，也不通过通知收件箱监控。完成由交接合约和 `workflow agent-apply` 控制。
