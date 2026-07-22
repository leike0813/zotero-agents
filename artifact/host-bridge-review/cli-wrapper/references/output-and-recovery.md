# 输出与错误合约

嵌入的命令合约使用 `host-bridge.agent-surface.v3` 和 `zotero-bridge.cli.v3`。

成功的命令输出一个包含 `ok`、`data` 和 `meta` 的 JSON 信封。通过命令特定的 `resultSchema` 解读 `data`；名称相似的 id 不是可互换的 handle。

仅在 `retryable` 为 true 时重试。当 `stateChanged` 为 true 时，在重复操作之前查询当前状态，绝不复用已消费的 handle。

## 故障决策矩阵

| retryable | stateChanged | handleConsumed | 安全响应 |
| --- | --- | --- | --- |
| true | false | false | 重新检查连接，然后重试同一有界命令。 |
| false | false | false | 在新的调用之前修正输入、授权或 capability 选择。 |
| any | true | false | 在决定是否需要另一次写入之前，查询命令特定的当前状态端点。 |
| any | any | true | 不要复用该 handle；检查其 receipt/状态，仅在允许时创建新操作。 |

## 部分 Apply-back

对于 `workflow agent-apply`，在 approval 之前对所有包进行预检。如果执行报告混合结果，保留 `agentRunId`，运行 `workflow agent-apply-status`，并使用 receipt 作为已应用、失败和可恢复请求的权威来源。

## 文件与分页恢复

持久化最后接受的页面，从 `nextCursor` 恢复，不要将同一页合并两次。在使用前验证文件校验和和字节数。本地路径、`fileId`、`productId` 和 workflow artifact 是不同的对象。

对于远程交付，遵循返回的 `delivery.mode`，使用不透明的 `fileId` 执行其 `downloadCommand`，并遵守 `unpackHint`。信封中的 Host 本地路径对远程 Agent 不可读。
