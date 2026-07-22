# Agent 拥有的交接

仅当 `executionModes.agentOwned.supported` 为 true 且调用 Agent 将在本地执行下载的请求合约时使用本旅程。

## 准备

先阅读 `workflow describe`。Agent 拥有的交接不能携带 Host 拥有的 workflow 选项或 provider profile。使用显式选择或 `--none` 以及受控输出目录调用 `workflow agent-run`。保留 `agentRunId`、每个 `agentRequestId`、包路径和校验和。

## 执行

在执行工作之前，打开每个请求包并读取其输入和输出合约。在本地验证每个结果包。不要编造文件名或结果模式，也不要仅因为另一个请求已就绪就 apply 部分准备好的请求。

## Apply 与审计

使用 `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>` 提交完整映射。Host Bridge 在 approval 或 handle 消费之前对所有包进行预检。一旦 apply 执行开始，将 `agentRunId` 视为一次性使用。

如果调用失败或返回混合结果，运行 `workflow agent-apply-status <agentRunId>`。持久化的 receipt 是预检失败、已应用请求、失败请求、状态变更、消费和可恢复性的权威来源。不要对 Agent 拥有的交接使用 `run get`、`run cancel`、活动任务或通知。

## 完成证据

返回请求 id、包校验和、验证结果、approval 结果、receipt 状态以及成功 apply-back 产生的任何实时 Zotero 对象。
