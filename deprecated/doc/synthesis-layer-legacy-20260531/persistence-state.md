# Synthesis 持久化与状态

## 目的

本文档锚定 Synthesis 的存储模型。它遵循二期重设计：热运行态以 SQLite-first 为原则，JSON assets 保留为 import、export、checkpoint、audit 和未来 sync envelope 的冷路径。

Status: `partial` / `transitional`。SQLite-first 运行态已经是目标主路径；`data/synthesis/**`、checkpoint/export/import 和部分 topic artifact helper 仍在冷路径与过渡收口中。

## 存储类别

| 类别 | Canonical 职责 | 示例 | 热路径 |
| --- | --- | --- | --- |
| SQLite 运行态 | 交互式 Synthesis 状态的本地事实源 | `state/zotero-agents.db`、`synt_*` 表 | 是 |
| JSON canonical assets | 持久冷路径资产 | `data/synthesis/**` | 否 |
| Workflow runtime files | Skill run workspace 与大型生成产物 | ACP/SkillRunner run root、日志、临时 payload | 否 |
| Debug profiler data | 仅供开发使用的性能跟踪 | `state/debug/synthesis-job-profiler.db` | 否 |

默认 UI、MCP、Host Bridge、review action 和 worker 路径必须读写 SQLite 运行态。它们不得隐式扫描 `data/synthesis/**`。

## SQLite 运行态

二期设计要求高频 Synthesis 数据使用 typed tables，而不是通用 JSON blob。当前实现锚点：

- `src/modules/synthesis/repository.ts`
  - `SynthesisRepository`
  - `createSynthesisRepository`
  - `getSynthesisRepositoryDatabasePath`
  - `resetSynthesisState`
- `src/modules/synthesis/service.ts`
  - `createSynthesisService`
  - `resetSynthesisDatabase`

Repository 负责 schema 初始化、migration、transaction、索引查询、适合分页的 DTO 和有界状态更新。领域代码不应通过 `plugin_task_rows.payload_json` 写入 Synthesis 运行态事实。

当前运行态 DB 包含 Synthesis 专用的 `synt_*` 表，用于承载：

- literature identity、identifiers、Zotero bindings、redirects 和 artifacts；
- reference instances 与 reference resolutions；
- citation graph structure、ownership、incoming groups、lightweight metrics 和 complex metrics；
- literature matching metadata、topic interest metadata 和 discovery hints；
- topic graph nodes、edges 和 review items；
- concept records、senses、aliases、relations、topic links 和 review items；
- tag vocabulary entries、aliases、abbreviations、protocols 和 validation；
- review queue items；
- dirty events 与 job state。

## JSON 冷路径

`data/synthesis/**` 仍然有效，但只服务于显式冷路径操作：

- checkpoint export；
- JSON import 或 migration tooling；
- audit 与 diagnostics；
- 未来 Git Sync envelope exchange；
- 测试与开发 fixtures。

正常 Workbench 列表、Home/Topics 状态、cleanup proposals、topic options、background jobs、startup reconcile 和 update queues 不得把 legacy JSON 状态作为隐式 fallback 展示。确实需要兼容旧文件时，必须通过显式 import、export 或详情读取操作进入。

当前实现锚点：

- `src/modules/synthesis/jsonImport.ts`
- `src/modules/synthesis/checkpointExport.ts`
- `src/modules/synthesis/foundation.ts`

## Reset 边界

Prefs 中的 reset 动作是运行态 reset，不是 canonical asset 删除。它会清空 Synthesis `synt_*` 运行态表，同时保留 DB 文件、schema metadata 和 `data/synthesis/**` JSON assets。

这个 reset 适合在开发中恢复“新安装插件”的 Synthesis 运行态视图。它不是数据迁移，并且 reset 后不得静默导入 JSON。

## Recover 边界

Recover 处理 SQLite 运行态不可打开、integrity check 失败、WAL/SHM 异常、migration 半失败或 schema meta 不一致等损坏场景。Recover 不是 reset：

| 动作 | 目标 | 是否丢弃 DB state | 是否需要用户确认 |
| --- | --- | --- | --- |
| Retry open | 临时锁或短暂 IO 失败后重试 | 否 | 否 |
| Integrity inspect | 读取 `PRAGMA integrity_check`、schema meta、table counts | 否 | 否 |
| Quarantine DB | 把损坏 DB 移到隔离位置并保留诊断 | 是，但保留原文件 | 是 |
| Rebuild runtime from Zotero/artifacts | 从 Zotero library 和 artifact notes 重建 Synthesis SQLite 运行态 | 是 | 是 |
| Restore from checkpoint | 从用户选择的 checkpoint/import bundle 恢复 | 是 | 是 |
| Clean-install reset | 清空 Synthesis runtime/file residue | 是 | 双重确认 |

检测到数据库损坏时，插件不得：

- 静默删除或覆盖 `state/zotero-agents.db`；
- 静默从 `data/synthesis/**` 导入旧 JSON；
- 继续运行普通 Synthesis worker 并写入可能损坏的 DB；
- 在 Workbench 中把半可读状态当作 ready snapshot。

目标行为：

1. 进入 `recovery_required` / degraded Synthesis state。
2. 暂停 Synthesis workers、startup reconcile fan-out 和 normal mutation entrypoints。
3. 展示 bounded diagnostic：错误类型、DB 可打开性、integrity summary、schema meta、可用恢复动作。
4. 如果 DB 仍可部分读取，可 best-effort 导出 durable effects / user overrides；导出失败不得阻塞 quarantine。
5. 用户选择恢复动作后才执行 quarantine、rebuild、restore 或 clean reset。

Recover 后的 rebuilt runtime 必须重新执行 registry/cache 与 graph rebuild；Topics/Tags/Concepts 的 DB-first state 只有在对应事实源仍可重建或 checkpoint restore 成功时才恢复。无法证明保留的 user override 应进入 Needs Attention，而不是被静默假定有效。

## Migration 边界

重设计明确避免插件启动时执行生产自动迁移。Migration/import 是用户或开发者显式动作，具备 dry-run/apply/verify 语义。打开 Zotero 或读取 Workbench snapshot 不得从旧 JSON 文件触发 migrate、repair、rebuild 或 enqueue work。

## 设计检查项

修改持久化行为前，先回答这些问题：

- 该状态是否被普通 UI/MCP/Host Bridge read 需要？如果是，它属于 SQLite。
- 该数据是否只用于 audit、checkpoint 或未来 sync？如果是，它属于 JSON 冷路径。
- read path 是否会 create、migrate、rebuild、enqueue 或扫描大文件？如果是，它违反 read-path purity。
- reset 是否在不删除 canonical assets 的前提下清空运行态？如果不是，它越过了 reset 边界。
- recover 是否先保留或隔离损坏 DB，并让用户选择恢复动作？如果直接静默 reset 或导入旧 JSON，它违反 recover 边界。
