
# src/modules/pluginStateStore/mutationAuthorityTable.ts
所属分层：[插件外壳与核心运行时](../../../../layers/plugin-core.md)  
所属目录：[src/modules/pluginStateStore](../../../../modules/src/modules/pluginStateStore.md)
<!-- node: file:src/modules/pluginStateStore/mutationAuthorityTable.ts -->

变更权威表（mutation authority）：持久化 canonical mutation 的 scope/operationId/语义摘要、终态证据与 identity binding，是受审批写入的唯一事实源。
源码：[src/modules/pluginStateStore/mutationAuthorityTable.ts](../../../../../../src/modules/pluginStateStore/mutationAuthorityTable.ts)

## 符号（2）
<!-- node: function:src/modules/pluginStateStore/mutationAuthorityTable.ts:createMutationAuthorityTable -->
<!-- node: function:src/modules/pluginStateStore/mutationAuthorityTable.ts:ensureMutationAuthorityTableSchema -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createMutationAuthorityTable | 函数 | 30–251 | 复杂 | persistence、mutation、authority、audit | 0 | 变更权威表的数据访问层：durable insert winner 判定、终态证据写入、identity binding 保留与按龄清理。 |
| ensureMutationAuthorityTableSchema | 函数 | 8–28 | 简单 | persistence、schema-definition、mutation、sqlite | 0 | 幂等创建 mutation authority 表结构，含语义摘要列、终态证据列与 identity binding 唯一约束。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [core.ts](core.ts.md) | src/modules/pluginStateStore/core.ts | pluginStateStore 的底层核心：SQLite 打开、连接复用、事务辅助与通用类型定义。 |
| [pluginStateStore.ts](../pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [pluginStateStore.ts](../pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createMutationAuthorityTable | 函数 | 30–251 | 变更权威表的数据访问层：durable insert winner 判定、终态证据写入、identity binding 保留与按龄清理。 |
| ensureMutationAuthorityTableSchema | 函数 | 8–28 | 幂等创建 mutation authority 表结构，含语义摘要列、终态证据列与 identity binding 唯一约束。 |
