
# src/modules/hostBridge/server/hostBridgeOperationStore.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server](../../../../../modules/src/modules/hostBridge/server.md)
<!-- node: file:src/modules/hostBridge/server/hostBridgeOperationStore.ts -->

Host Bridge 服务端操作存储：基于 pluginStateStore 记录 Bridge 操作的 view 与 receipt，并按任务保留策略清理过期记录。
源码：[src/modules/hostBridge/server/hostBridgeOperationStore.ts](../../../../../../../src/modules/hostBridge/server/hostBridgeOperationStore.ts)

## 符号（4）
<!-- node: function:src/modules/hostBridge/server/hostBridgeOperationStore.ts:completeHostBridgeOperation -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeOperationStore.ts:markHostBridgeOperationOutcomeUnknown -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeOperationStore.ts:recoverHostBridgeOperationStoreAfterRestart -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeOperationStore.ts:reserveHostBridgeOperation -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| completeHostBridgeOperation | 函数 | 127–167 | 复杂 | host-bridge、operation-store、state-transition、persistence | 0 | 以 compare-and-set 方式把操作推进到终态，并返回带 receipt 的 view。 |
| markHostBridgeOperationOutcomeUnknown | 函数 | 169–190 | 中等 | host-bridge、operation-store、recovery、state-transition | 1 | 当终态证据无法确认时把操作标记为 outcome unknown，保留重放与人工修复入口。 |
| recoverHostBridgeOperationStoreAfterRestart | 函数 | 192–215 | 中等 | host-bridge、recovery、reconciliation、operation-store | 0 | 插件重启后对遗留 started 操作做协调：分类为 unknown 或按通用取消语义收敛。 |
| reserveHostBridgeOperation | 函数 | 88–125 | 复杂 | host-bridge、operation-store、concurrency、persistence | 0 | 为一次 Bridge 操作占位：durable insert winner 才成为执行 owner，其它调用只读到已存 view。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [pluginStateStore.ts](../../pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [taskRetentionPolicy.ts](../../taskRetentionPolicy.ts.md) | src/modules/taskRetentionPolicy.ts | 任务记录保留策略的单一事实源，导出统一的保留时长常量，供 Host Bridge operation store、Dashboard history 等持久化层共同引用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeServer.ts](hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| completeHostBridgeOperation | 函数 | 127–167 | 以 compare-and-set 方式把操作推进到终态，并返回带 receipt 的 view。 |
| markHostBridgeOperationOutcomeUnknown | 函数 | 169–190 | 当终态证据无法确认时把操作标记为 outcome unknown，保留重放与人工修复入口。 |
| recoverHostBridgeOperationStoreAfterRestart | 函数 | 192–215 | 插件重启后对遗留 started 操作做协调：分类为 unknown 或按通用取消语义收敛。 |
| reserveHostBridgeOperation | 函数 | 88–125 | 为一次 Bridge 操作占位：durable insert winner 才成为执行 owner，其它调用只读到已存 view。 |
