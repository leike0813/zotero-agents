
# src/modules/pluginStateStore
> 目录聚合页：5 个文件、10 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/pluginStateStore/core.ts](../../../files/src/modules/pluginStateStore/core.ts.md) | 文件 | 2 | pluginStateStore 的底层核心：SQLite 打开、连接复用、事务辅助与通用类型定义。 |
| [src/modules/pluginStateStore/literatureMigrationTables.ts](../../../files/src/modules/pluginStateStore/literatureMigrationTables.ts.md) | 文件 | 2 | 文献库迁移相关数据表的建表语句、schema 版本与读写封装，为 Dashboard 本地迁移服务提供持久化支撑。 |
| [src/modules/pluginStateStore/mutationAuthorityTable.ts](../../../files/src/modules/pluginStateStore/mutationAuthorityTable.ts.md) | 文件 | 2 | 变更权威表（mutation authority）：持久化 canonical mutation 的 scope/operationId/语义摘要、终态证据与 identity binding，是受审批写入的唯一事实源。 |
| [src/modules/pluginStateStore/runTables.ts](../../../files/src/modules/pluginStateStore/runTables.ts.md) | 文件 | 2 | 工作流运行记录表：保存 run 的状态、阶段与诊断信息，并在 debug 模式或性能 profiler 打开时附加审计字段。 |
| [src/modules/pluginStateStore/taskTables.ts](../../../files/src/modules/pluginStateStore/taskTables.ts.md) | 文件 | 2 | 任务表层：任务队列、任务状态迁移、附件与产物元数据的持久化读写，是后台任务恢复与保留策略的主要落点。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](../modules.md) | 5 |
| [src/modules/acp/diagnostics](acp/diagnostics.md) | 1 |
