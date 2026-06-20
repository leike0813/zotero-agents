# Plugin State Store

## Overview

`src/modules/pluginStateStore.ts` 是插件的状态持久化层。它提供双模态 SQLite 适配器，管理通用任务表、ACP 专用 run store、SkillRunner 专用 run store、workflow 产物表和迁移元数据，并向 `runtimePersistence.ts` 注册治理钩子。

```
┌──────────────────────────────────────────────────────────────┐
│                     pluginStateStore.ts                      │
│                                                              │
│  Stores                               Tables                 │
│  ┌──────────────┐              ┌──────────────────────────┐  │
│  │ metadata      │──────────────► plugin_meta              │  │
│  ├──────────────┤              ├──────────────────────────┤  │
│  │ task domains  │──────────────► plugin_task_requests     │  │
│  │              │              │ plugin_task_contexts     │  │
│  │              │              │ plugin_task_rows         │  │
│  ├──────────────┤              ├──────────────────────────┤  │
│  │ ACP runs      │──────────────► plugin_acp_skill_runs    │  │
│  │              │              │ plugin_acp_skill_run_events│ │
│  ├──────────────┤              ├──────────────────────────┤  │
│  │ SkillRunner   │──────────────► plugin_skillrunner_runs  │  │
│  │ runs          │              │ plugin_skillrunner_      │  │
│  │              │              │ run_events               │  │
│  └──────────────┘              └──────────────────────────┘  │
│                                                              │
│  Adapter: SQLite (Zotero) / Map (Test)                       │
└──────────────────────────────────────────────────────────────┘
```

配套文档：
- `doc/components/runtime-persistence-governance-ssot.md` — 运行时持久化治理
- `doc/components/skillrunner-provider-state-machine-ssot.md` — SkillRunner run settlement 状态机
- `doc/components/workflow-execution-seams.md` — 工作流执行 seam 与 deferred completion 边界

## 数据库 Schema

### plugin_meta

键值元数据表，存储迁移状态。

| 列 | 类型 | 用途 |
|----|------|------|
| key | TEXT PRIMARY KEY | 元数据键 |
| value | TEXT | JSON 值 |
| updated_at | TEXT | ISO 8601 时间戳 |

当前使用的元数据包括 schema/migration 标记和 run store hard-cut/reset 标记。

### plugin_task_requests

外部系统请求跟踪，按 domain + request_id 去重。

| 列 | 类型 | 用途 |
|----|------|------|
| domain | TEXT | 分区键 |
| request_id | TEXT | 请求标识 |
| backend_id | TEXT | 来源后端 |
| state | TEXT | 当前状态 |
| updated_at | TEXT | 更新时间 |
| payload | TEXT | JSON 载荷 |

**主键**：`(domain, request_id)`
**消费者**：通用 task/request 域和 ACP conversation 路径。SkillRunner run 的当前 SSOT 不在该表。

### plugin_task_contexts

上下文/会话数据，按 domain + context_id 去重。

| 列 | 类型 | 用途 |
|----|------|------|
| domain | TEXT | 分区键 |
| context_id | TEXT | 上下文标识 |
| request_id | TEXT | 关联请求 |
| backend_id | TEXT | 来源后端 |
| state | TEXT | 当前状态 |
| updated_at | TEXT | 更新时间 |
| payload | TEXT | JSON 载荷 |

**主键**：`(domain, context_id)`
**消费者**：通用 task/context 域和 ACP conversation 使用的上下文路径。SkillRunner sequence 与 reconciler settlement 的当前 SSOT 不在该表。

### plugin_task_rows

通用任务行存储，按 domain + scope + task_id 三级分区。

| 列 | 类型 | 用途 |
|----|------|------|
| domain | TEXT | 分区键 |
| scope | TEXT | 二级分区（active / history / skill-runs / products / ...） |
| task_id | TEXT | 任务标识 |
| request_id | TEXT | 关联请求 |
| backend_id | TEXT | 来源后端 |
| state | TEXT | 当前状态 |
| updated_at | TEXT | 更新时间 |
| payload | TEXT | JSON 载荷 |

**主键**：`(domain, scope, task_id)`
**消费者**：通用 task row、workflow product、ACP conversation 路径。SkillRunner Dashboard/Task projection 当前从 `plugin_skillrunner_runs` 派生。

### plugin_acp_skill_runs / plugin_acp_skill_run_events

ACP Skills 专用 run store。保存 ACP conversation、transcript、permission、reply、workspace、result 和 apply state。SkillRunner `request_id` 不写入 ACP run store。

### plugin_skillrunner_runs / plugin_skillrunner_run_events

SkillRunner 专用 run store。保存 SkillRunner backend/request/workflow/job identity、run state、apply state、retry state、request payload、provider options、result paths、bundle/workspace summary、sequence root/step metadata 和 projectable 标记。

SkillRunner sequence root 和 step 都存在该 store 中：

- root record：编排状态，`projectable=false`
- step record：独立 run projection，`projectable=true`

Dashboard、Task Manager、popover 和 RunDialog 读取由该 store 派生的 projection。

## 域（Domain）

四个域常量作为表的一级分区键：

| 域常量 | 值 | 用途 | 消费者 |
|--------|-----|------|--------|
| `PLUGIN_TASK_DOMAIN_SKILLRUNNER` | `"skillrunner"` | SkillRunner task cleanup 域 | runtimePersistence cleanup |
| `PLUGIN_TASK_DOMAIN_ACP` | `"acp"` | ACP 技能运行轨道 | acpConversationStore, acpSkillRunStore |
| `PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS` | `"workflow-products"` | 工作流产物 | workflowProductStore |
| `PLUGIN_TASK_DOMAIN_WORKFLOW_SEQUENCE` | `"workflow-sequence"` | 全局 sequence cleanup 域 | runtimePersistence cleanup |

域分离防止不同子系统间的键冲突，并支持独立的清除/统计操作。

## 双模态适配器

```typescript
type SqlAdapter = {
  run(sql: string, params?: Record<string, unknown>): void;
  all<T = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): T[];
  get<T = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): T | null;
  transaction<T>(callback: () => T): T;
};
```

### Zotero SQLite 适配器

- 运行时检测：存在 `globalThis.Services` 和 `globalThis.Zotero`
- 数据库：`getGuardedSqliteConnection()` → `Services.storage.openDatabase`
- 文件路径：`<Zotero.DataDirectory>/zotero-agents/state/zotero-agents.db`
- 边界：该库只承载 workflow/plugin runtime state；Synthesis `synt_*` state 使用 sibling `state/synthesis.db`
- SQL 方言：SQLite

### 内存适配器（测试）

- 运行时检测：不存在 Zotero 全局 API
- 实现：`buildMemoryAdapter()` — 基于 `Map<string, Map<string, Row>>` 的 SQL 模拟器
- 行为：解析规范化的 SQL 文本决定操作，保留 Insert/Select/Delete 语义
- 优势：测试无需真实 SQLite，`resetPluginStateStoreForTests()` 快速重置

## 初始化与迁移

`getAdapter()` 在首次调用时执行一次性初始化：

```
getAdapter()
  → 选择适配器（SQLite / Memory）
  → ensureSchema():
      CREATE TABLE IF NOT EXISTS plugin_meta (...)
      CREATE TABLE IF NOT EXISTS plugin_task_requests (...)
      CREATE TABLE IF NOT EXISTS plugin_task_contexts (...)
      CREATE TABLE IF NOT EXISTS plugin_task_rows (...)
      CREATE INDEX IF NOT EXISTS ...
  → 检查 plugin_meta: migration_task_state_v1 = "done"?
      → 否: 执行迁移
```

### 迁移源

从三个遗留 Zotero 偏好键迁移：

| 偏好键 | 目标表 |
|--------|--------|
| `skillRunnerRequestLedgerJson` | `plugin_task_requests` |
| `skillRunnerDeferredTasksJson` | `plugin_task_contexts` |
| `taskDashboardHistoryJson` | `plugin_task_rows` |

迁移过程：读取偏好 → JSON 解析 → 批量插入 → 清除偏好 → 写入 `migration_task_state_v1 = "done"`

## 关键不变性

| 规则 | 说明 |
|------|------|
| 字符串规范化 | 所有字段写入前 `normalizeString()`（trim + 空串→空串） |
| Null 转为 null | `null` / `undefined` / 非有限数值写入前转为 `null` |
| Payload 兜底 | 空 payload → `"{}"` |
| 幂等 upsert | `INSERT OR REPLACE` 基于主键 |
| 事务批量 | `replace*` 函数使用 `transaction()`，先 DELETE ALL 再逐条 INSERT |
| 时间戳排序 | 所有 `list*` 查询按 `updated_at DESC` |
| 域隔离 | 所有查询限定在 domain 内 |

## API 分类

| 类别 | 函数 | 覆盖的表 | 说明 |
|------|------|---------|------|
| 请求条目 CRUD | 6 | `plugin_task_requests` | list / get / upsert / replace / delete / deleteByBackend |
| 上下文条目 CRUD | 5 | `plugin_task_contexts` | list / upsert / replace / delete / deleteByBackend |
| 行条目 CRUD | 6 | `plugin_task_rows` | list / upsert / replace / clear / delete / deleteByBackend |
| 域级操作 | 6 | 3 表 | clear / count / estimateBytes（含 ExceptRowScopes 变体） |
| 作用域操作 | 3 | `plugin_task_rows` | clear / count / estimateBytes |
| 基础设施 | 6 | — | getPluginDataDirectoryPath / getPluginStateDatabasePath / resetTest / getMigrationStatus / inspectCounts / exportRowsForTests |

## 治理钩子

模块启动时注册 9 个回调到 `runtimePersistence.ts`：

```typescript
registerPluginTaskDomainClearer(clearPluginTaskDomain)
registerPluginTaskDomainExceptRowScopesClearer(clearPluginTaskDomainExceptRowScopes)
registerPluginTaskScopeClearer(clearPluginTaskScope)

registerPluginTaskDomainCounter(countPluginTaskDomain)
registerPluginTaskDomainExceptRowScopesCounter(countPluginTaskDomainExceptRowScopes)
registerPluginTaskScopeCounter(countPluginTaskScope)

registerPluginTaskDomainByteEstimator(estimatePluginTaskDomainBytes)
registerPluginTaskDomainExceptRowScopesByteEstimator(estimatePluginTaskDomainExceptRowScopesBytes)
registerPluginTaskScopeByteEstimator(estimatePluginTaskScopeBytes)
```

使 `runtimePersistence.ts` 能统一管理所有持久化域（清除、统计、字节估算）。

## 测试支持

| 函数 | 用途 |
|------|------|
| `resetPluginStateStoreForTests()` | 重置 adapter 为 null，重新初始化 |
| `exportPluginStateStoreRowsForTests()` | 导出三张表所有行用于断言 |
| `inspectPluginStateStoreCounts()` | 返回 `{ requestCount, contextCount, rowCount }` |
| 内存适配器 | 测试无需真实 SQLite，无环境依赖 |
