# Plugin State Store

`src/modules/pluginStateStore.ts` 是插件数据库的公共入口和组合根。它选择运行时
adapter、按固定顺序初始化 schema、清理遗留偏好，并保留现有公共函数。具体表的
DDL、行编解码和 SQL 操作位于 `src/modules/pluginStateStore/` 下的私有模块：

| 模块 | 所有权 |
|---|---|
| `core.ts` | 最小 SQL adapter 契约、共享值规范化、显式测试 adapter 注入 |
| `taskTables.ts` | request、context、task row 三张通用任务表 |
| `runTables.ts` | ACP、SkillRunner、事件和 workflow sequence 表 |
| `mutationAuthorityTable.ts` | canonical mutation admission、终态证据和过期处理 |
| `literatureMigrationTables.ts` | literature migration run 与 set receipt |

这些模块是同一个插件数据库内部的表族边界，并非多个数据库或公开 repository
接口。`runtimePersistence.ts` 仍是数据库路径等跨运行时文件系统选择的事实源。

## Adapter

公共存储逻辑只依赖同步的 `SqlAdapter`：`run`、`all`、`get`、`transaction`，以及
可选的 `close`。

- Zotero 插件运行时使用 `getGuardedSqliteConnection()`，数据库位于
  `<plugin data>/state/zotero-agents.db`。
- Node 测试由 `tests/setup/zotero-mock.ts` 显式注入基于 Node 24
  `node:sqlite` 的 `:memory:` adapter。
- 生产 bundle 不导入 `node:sqlite`。没有 Zotero global 且没有显式测试注入时，
  初始化会直接失败。

测试与插件运行时因此执行相同的 SQLite schema、约束、复合主键和查询语义。

## Schema

`plugin_meta` 只有 `key TEXT PRIMARY KEY` 和 `value TEXT NOT NULL`。当前保存遗留
偏好清理标记 `migration_task_state_v1`，以及 separated run store hard-cut 标记。

### 通用任务表

| 表 | 主键 | 其余列 |
|---|---|---|
| `plugin_task_requests` | `(domain, request_id)` | `backend_id`, `state`, `updated_at`, `payload_json` |
| `plugin_task_contexts` | `(domain, context_id)` | `request_id`, `backend_id`, `state`, `updated_at`, `payload_json` |
| `plugin_task_rows` | `(domain, scope, task_id)` | `request_id`, `backend_id`, `state`, `updated_at`, `payload_json` |

公开 domain 常量为 `skillrunner`、`acp`、`workflow-products` 和
`workflow-sequence`。domain 与 scope 共同隔离清理、统计和投影；SkillRunner run
本身不以这些通用任务表为 SSOT。

### Run 与 sequence 表

`plugin_acp_skill_runs` 和 `plugin_skillrunner_runs` 以 `run_key` 为主键，保存
`request_id`、`backend_id`、`state`、`updated_at` 和 `payload_json`。对应的
`*_run_events` 以 `event_id` 为主键，保存 run/request/backend identity、事件类型、
创建时间和 payload。

`plugin_workflow_sequence_runs` 以 `sequence_run_id` 为主键，保存 workflow run、
workflow、backend identity、状态、更新时间和 payload。ACP 与 SkillRunner 的
物理 run store 保持独立。

### Mutation authority

`plugin_mutation_authority` 的主键是 `(scope, operation_id)`。它持有 operation、
semantic digest/input、`started | terminal | identity_only` 状态、result、创建时间、
终态时间和最后访问时间。`INSERT OR IGNORE` 的实际插入者是唯一执行 winner；证据
过期只清除可重放结果并永久保留 identity binding。

### Literature migration

`plugin_literature_artifact_migration_runs` 以 `run_id` 为主键，保存 operation、
migration definition、library、状态、计数、时间和有界 diagnostics。
`plugin_literature_artifact_migration_sets` 以 `(run_id, candidate_id)` 为主键，保存
operation、ordinal、portable refs、basis、classification、outcome、计数、时间和
有界 diagnostics。完整 artifact payload 不写入插件状态库。

## 初始化与遗留状态

首次访问依次执行：

1. 创建 `plugin_meta`；
2. 初始化 task、run、mutation authority、literature migration 四个表族；
3. 探测 schema；
4. 处理遗留任务偏好；
5. 执行 separated run store hard-cut；
6. 验证 `migration_task_state_v1=done` 后发布 adapter。

`skillRunnerRequestLedgerJson`、`skillRunnerDeferredTasksJson` 和
`taskDashboardHistoryJson` 中的旧行不再迁移进 SQLite。初始化事务会清空对应旧
载体表范围、写入完成标记，随后把三个偏好置空。这样不会把已经退役的 SkillRunner
状态重新引入当前 run store。

## 行为约束

- 字符串写入前 trim；空 payload 规范为 `{}`。
- 复合 identity 由 SQLite 主键表达，不拼接字符串 key。
- 批量 replace 与跨表清理在 adapter transaction 中执行。
- 列表查询保持现有过滤、排序、limit 和 cursor 行为。
- Runtime Persistence Governance 只调用公共 clear/count/estimate 操作；保留期限和
  文件清理策略不属于本模块。

## 测试支持

`resetPluginStateStoreForTests()` 清空所有插件状态表与 meta、关闭当前测试连接并
重置初始化状态。`inspectPluginStateStoreCounts()` 和
`exportPluginStateStoreRowsForTests()` 保留既有诊断/断言接口。Node 测试 adapter 是
测试基础设施，不是插件运行时的 fallback。
