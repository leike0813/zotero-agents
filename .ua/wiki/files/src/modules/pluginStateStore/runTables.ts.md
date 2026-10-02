
# src/modules/pluginStateStore/runTables.ts
所属分层：[插件外壳与核心运行时](../../../../layers/plugin-core.md)  
所属目录：[src/modules/pluginStateStore](../../../../modules/src/modules/pluginStateStore.md)
<!-- node: file:src/modules/pluginStateStore/runTables.ts -->

工作流运行记录表：保存 run 的状态、阶段与诊断信息，并在 debug 模式或性能 profiler 打开时附加审计字段。
源码：[src/modules/pluginStateStore/runTables.ts](../../../../../../src/modules/pluginStateStore/runTables.ts)

## 符号（2）
<!-- node: function:src/modules/pluginStateStore/runTables.ts:createRunTables -->
<!-- node: function:src/modules/pluginStateStore/runTables.ts:ensureRunTablesSchema -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createRunTables | 函数 | 114–629 | 复杂 | persistence、run-state、workflow、data-model | 0 | 工作流 run 记录的数据访问层：状态迁移、阶段事件、诊断与连接审计字段的读写。 |
| ensureRunTablesSchema | 函数 | 25–112 | 中等 | persistence、schema-definition、run-state、sqlite | 0 | 幂等创建 run 相关表与索引；debug 模式与性能 profiler 打开时附加诊断列。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimePerformanceProfiler.ts](../acp/diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [core.ts](core.ts.md) | src/modules/pluginStateStore/core.ts | pluginStateStore 的底层核心：SQLite 打开、连接复用、事务辅助与通用类型定义。 |
| [debugMode.ts](../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [pluginStateStore.ts](../pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [pluginStateStore.ts](../pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createRunTables | 函数 | 114–629 | 工作流 run 记录的数据访问层：状态迁移、阶段事件、诊断与连接审计字段的读写。 |
| ensureRunTablesSchema | 函数 | 25–112 | 幂等创建 run 相关表与索引；debug 模式与性能 profiler 打开时附加诊断列。 |
