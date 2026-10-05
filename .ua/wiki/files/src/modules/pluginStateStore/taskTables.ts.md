
# src/modules/pluginStateStore/taskTables.ts
所属分层：[插件外壳与核心运行时](../../../../layers/plugin-core.md)  
所属目录：[src/modules/pluginStateStore](../../../../modules/src/modules/pluginStateStore.md)
<!-- node: file:src/modules/pluginStateStore/taskTables.ts -->

任务表层：任务队列、任务状态迁移、附件与产物元数据的持久化读写，是后台任务恢复与保留策略的主要落点。
源码：[src/modules/pluginStateStore/taskTables.ts](../../../../../../src/modules/pluginStateStore/taskTables.ts)

## 符号（2）
<!-- node: function:src/modules/pluginStateStore/taskTables.ts:createTaskTables -->
<!-- node: function:src/modules/pluginStateStore/taskTables.ts:ensureTaskTablesSchema -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createTaskTables | 函数 | 93–1167 | 复杂 | persistence、task-queue、data-model、state | 0 | 任务表的数据访问层：任务生命周期、队列顺序、附件与产物元数据，是后台任务恢复的主要落点。 |
| ensureTaskTablesSchema | 函数 | 30–91 | 中等 | persistence、schema-definition、task-queue、sqlite | 0 | 幂等创建任务表结构与索引，保证旧库升级后字段齐备。 |

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
| createTaskTables | 函数 | 93–1167 | 任务表的数据访问层：任务生命周期、队列顺序、附件与产物元数据，是后台任务恢复的主要落点。 |
| ensureTaskTablesSchema | 函数 | 30–91 | 幂等创建任务表结构与索引，保证旧库升级后字段齐备。 |
