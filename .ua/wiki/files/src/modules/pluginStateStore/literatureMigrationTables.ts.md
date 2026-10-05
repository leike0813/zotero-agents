
# src/modules/pluginStateStore/literatureMigrationTables.ts
所属分层：[插件外壳与核心运行时](../../../../layers/plugin-core.md)  
所属目录：[src/modules/pluginStateStore](../../../../modules/src/modules/pluginStateStore.md)
<!-- node: file:src/modules/pluginStateStore/literatureMigrationTables.ts -->

文献库迁移相关数据表的建表语句、schema 版本与读写封装，为 Dashboard 本地迁移服务提供持久化支撑。
源码：[src/modules/pluginStateStore/literatureMigrationTables.ts](../../../../../../src/modules/pluginStateStore/literatureMigrationTables.ts)

## 符号（2）
<!-- node: function:src/modules/pluginStateStore/literatureMigrationTables.ts:createLiteratureMigrationTables -->
<!-- node: function:src/modules/pluginStateStore/literatureMigrationTables.ts:ensureLiteratureMigrationTablesSchema -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createLiteratureMigrationTables | 函数 | 79–419 | 复杂 | persistence、migration、literature、data-model | 0 | 封装文献迁移 scan/apply 所需的全部表操作：legacy 记录、配对关系、进度与 repair 队列。 |
| ensureLiteratureMigrationTablesSchema | 函数 | 17–77 | 中等 | persistence、schema-definition、migration、sqlite | 0 | 幂等创建文献迁移相关表与索引，是 Dashboard 本地迁移服务启动时的 schema 准备步骤。 |

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
| createLiteratureMigrationTables | 函数 | 79–419 | 封装文献迁移 scan/apply 所需的全部表操作：legacy 记录、配对关系、进度与 repair 队列。 |
| ensureLiteratureMigrationTablesSchema | 函数 | 17–77 | 幂等创建文献迁移相关表与索引，是 Dashboard 本地迁移服务启动时的 schema 准备步骤。 |
