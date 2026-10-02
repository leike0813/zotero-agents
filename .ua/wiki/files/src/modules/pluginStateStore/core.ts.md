
# src/modules/pluginStateStore/core.ts
所属分层：[插件外壳与核心运行时](../../../../layers/plugin-core.md)  
所属目录：[src/modules/pluginStateStore](../../../../modules/src/modules/pluginStateStore.md)
<!-- node: file:src/modules/pluginStateStore/core.ts -->

pluginStateStore 的底层核心：SQLite 打开、连接复用、事务辅助与通用类型定义。
源码：[src/modules/pluginStateStore/core.ts](../../../../../../src/modules/pluginStateStore/core.ts)

## 符号（2）
<!-- node: function:src/modules/pluginStateStore/core.ts:configurePluginStateTestAdapterFactory -->
<!-- node: function:src/modules/pluginStateStore/core.ts:createPluginStateTestAdapter -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| configurePluginStateTestAdapterFactory | 函数 | 49–58 | 简单 | testability、persistence、dependency-injection、core | 0 | 注入测试用 adapter 工厂，使 pluginStateStore 子模块可以在无 Zotero 环境下验证 SQL 行为。 |
| createPluginStateTestAdapter | 函数 | 60–70 | 简单 | testability、persistence、utility、core | 0 | 基于注入工厂构造测试 adapter，统一行数上限、状态归一化与时间戳生成。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureMigrationTables.ts](literatureMigrationTables.ts.md) | src/modules/pluginStateStore/literatureMigrationTables.ts | 文献库迁移相关数据表的建表语句、schema 版本与读写封装，为 Dashboard 本地迁移服务提供持久化支撑。 |
| [mutationAuthorityTable.ts](mutationAuthorityTable.ts.md) | src/modules/pluginStateStore/mutationAuthorityTable.ts | 变更权威表（mutation authority）：持久化 canonical mutation 的 scope/operationId/语义摘要、终态证据与 identity binding，是受审批写入的唯一事实源。 |
| [pluginStateStore.ts](../pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [runTables.ts](runTables.ts.md) | src/modules/pluginStateStore/runTables.ts | 工作流运行记录表：保存 run 的状态、阶段与诊断信息，并在 debug 模式或性能 profiler 打开时附加审计字段。 |
| [taskTables.ts](taskTables.ts.md) | src/modules/pluginStateStore/taskTables.ts | 任务表层：任务队列、任务状态迁移、附件与产物元数据的持久化读写，是后台任务恢复与保留策略的主要落点。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| configurePluginStateTestAdapterFactory | 函数 | 49–58 | 注入测试用 adapter 工厂，使 pluginStateStore 子模块可以在无 Zotero 环境下验证 SQL 行为。 |
| createPluginStateTestAdapter | 函数 | 60–70 | 基于注入工厂构造测试 adapter，统一行数上限、状态归一化与时间戳生成。 |
