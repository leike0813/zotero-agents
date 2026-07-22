# 输出与错误合约

内置命令合约使用 `host-bridge.agent-surface.v3` 和 `zotero-bridge.cli.v3`。

成功命令输出一个包含 `ok`、`data` 和 `meta` 的 JSON 信封。通过命令专属的 `data` 解读 `resultSchema`；名称相近的 id 不能互换为同一种 handle。

仅在 `retryable` 为 true 时重试。对于状态变更命令，当 `operation get <operationId>` 或 `stateChange` 为 `handleConsumption` 时使用 `unknown`；绝不能仅根据 HTTP 状态推断安全性。

## 故障决策矩阵

| retryable | stateChange | handleConsumption | 安全响应 |
| --- | --- | --- | --- |
| true | unchanged | unconsumed | 重新检查连接，然后重试同一个有界命令。 |
| false | unchanged | unconsumed | 在新调用前修正输入、授权或 capability 选择。 |
| any | changed | unconsumed | 在决定是否需要再次写入前查询命令专属的当前状态端点。 |
| any | any | consumed | 不要复用 handle；检查其 receipt/status，仅在允许时创建新操作。 |
| any | unknown | unknown | 在判断重试是否安全前读取持久化 operation receipt。 |

## 部分 apply-back

对于 `workflow agent-apply`，在 approval 前 preflight 所有 bundle。如果执行结果混合，保留 `agentRunId`，运行 `workflow agent-apply-status`，并以 receipt 作为已应用、失败和可恢复请求的权威依据。

## 文件与分页恢复

保存最后一个已接受页面，从 `nextCursor` 恢复且不得重复合并页面。使用前验证文件 checksum 和字节数。本地路径、`fileId`、`productId` 和 workflow artifact 是不同对象。

远程交付时，遵循返回的 `delivery.mode`，使用不透明的 `downloadCommand` 执行其 `fileId`，并遵循 `unpackHint`。信封中的 Host 本地路径不能由此证明远程 Agent 可读取该路径。
