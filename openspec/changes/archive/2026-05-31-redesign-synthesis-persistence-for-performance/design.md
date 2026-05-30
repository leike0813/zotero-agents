# Design

## Architecture Baseline

Synthesis 采用两层持久化模型：

1. **SQLite local working state**：`state/zotero-agents.db` 是 UI、MCP、Host Bridge、review action、dirty queue、job state、Index、Citation Graph、Topic / Concept / Tag runtime state 的本地 source of truth。
2. **JSON canonical checkpoint assets**：`data/synthesis/` 只承载显式 import / export / checkpoint / audit / future sync。它不是 Workbench snapshot、MCP read、后台 worker 的默认读取来源。

这意味着后续实现不能继续把大型 JSON projection 作为热路径优化目标；应把查询、事务、分页、review action 和 worker 消费都迁入 typed SQLite repository。

## Repository Boundary

新增 Synthesis repository 层，职责包括：

- schema version 和幂等 migration；
- typed transaction；
- indexed / paginated query；
- bounded UI / MCP DTO assembly；
- dirty event / job state / review queue 操作；
- checkpoint import / export 的 DB 边界。

高频 Synthesis 状态不得继续依赖 `plugin_task_rows.payload_json` 作为主路径。该表可继续服务通用插件任务，但 Synthesis 领域状态需要 typed tables。

Phase 1 repository foundation SHALL use the existing plugin state database path
`state/zotero-agents.db`. It SHALL not create a separate `synthesis-layer.db`
runtime database. The repository owns only tables prefixed with `synt_` and a
small schema meta namespace inside `synt_schema_meta`; existing generic plugin
tables remain owned by `pluginStateStore`.

The base table groups are:

- `synt_schema_meta`: repository schema version and migration markers.
- `synt_dirty_event`: coalesced mutation events consumed by Synthesis workers.
- `synt_job_state`: per-job latest state, retry, budget, and diagnostics.
- `synt_review_item`: typed P0 / P1 / P2 review queue rows and dependency
  blocking state.
- `synt_literature_item`: unified literature entities, including Zotero-bound
  and reference-only items.
- `synt_literature_identifier`: DOI, arXiv, ISBN, normalized URL, citeKey, and
  other identity signals. Identifiers are indexed by kind/value but do not
  become `literature_item_id`.
- `synt_zotero_binding`: Zotero library/item binding state for literature
  items.
- `synt_artifact_state`: digest / references / citation-analysis availability
  and facet hashes.
- `synt_reference_instance`: references extracted from source literature items.
- `synt_reference_resolution`: resolution state for each reference instance.

Phase 1 creates the tables and indexes but does not migrate Workbench, MCP, or
canonical JSON hot paths. Those read/write migrations are Phase 2+ work.

Recommended primary keys and identity rules:

- `synt_literature_item.literature_item_id` is a stable surrogate key such as
  `lit:<ulid>` and is never derived from DOI, URL, title, normalized title,
  citeKey, agent metadata, or embedding.
- `synt_literature_identifier` primary key is
  `(literature_item_id, kind, normalized_value)`. It also has an index on
  `(kind, normalized_value)` for candidate lookup. This index is intentionally
  non-unique so conflicts enter review instead of forcing automatic merge.
- `synt_zotero_binding` primary key is `(library_id, item_key)` with an index on
  `literature_item_id`.
- `synt_reference_instance.reference_instance_id` and
  `synt_reference_resolution.resolution_id` are stable surrogate keys. Source
  and target links reference `literature_item_id`.
- `synt_review_item.review_item_id`, `synt_dirty_event.event_id`, and
  `synt_job_state.job_name` are stable repository keys.

Minimum indexes required in Phase 1:

- literature list / Index reads:
  `(status, updated_at DESC)`,
  `(normalized_title)`,
  `(created_from, status)`;
- Zotero-bound top-level reads:
  `synt_zotero_binding(library_id, item_key)` and
  `synt_zotero_binding(literature_item_id, binding_status)`;
- reference expansion:
  `synt_reference_instance(source_literature_item_id, reference_index)`,
  `synt_reference_resolution(reference_instance_id)`,
  `synt_reference_resolution(target_literature_item_id, status)`;
- review queue:
  `synt_review_item(priority, status, updated_at DESC)`,
  `synt_review_item(scope_kind, scope_ref, status)`,
  `synt_review_item(blocked_by_review_item_id, status)`;
- dirty queue / jobs:
  `synt_dirty_event(status, next_retry_at, updated_at)`,
  `synt_dirty_event(scope_kind, scope_ref, event_type, status)`,
  `synt_job_state(status, updated_at DESC)`.

The repository API boundary for Phase 1 is deliberately small:

- `initialize()` / `migrate()` apply idempotent migrations.
- `transaction(fn)` runs a synchronous repository transaction and rolls back on
  thrown errors.
- `paginate(input)` normalizes cursor / limit with max-limit enforcement.
- `inspectSchema()` returns table and index names for tests and diagnostics.
- `upsertLiteratureItem()` and `getLiteratureItem()` provide one minimal typed
  domain operation to prove writes do not use `plugin_task_rows.payload_json`.
- Additional domain-specific repository methods are added in Phase 2 when
  `getPaperRegistry()`, Workbench Index, and review actions move to SQLite.

Repository reads SHALL be side-effect free: no JSON canonical scan, no Zotero
library scan, no projection rebuild, and no dirty-event enqueue. Missing rows or
stale state are represented as diagnostics returned by higher-level services.

## Index and Identity

Index 的基本实体是统一的 `literature_item`。Zotero 库内条目只是 `literature_item` 的一种 binding；references 引出的外部文献也是同一实体模型。

`literature_item_id` 必须是无语义 surrogate key，例如 `lit:<ulid>`。DOI、URL、arXiv、citeKey、title、normalized title、agent metadata 或 embedding 都不能成为主键。`normalized_title` 是唯一语义相关弱 identity signal，必须由 host deterministic normalizer 生成；它只能作为候选匹配证据，不允许全局唯一约束。

`normalized_title` v1 is deterministic and mechanical: Unicode NFKC, fixed
locale lower-case, punctuation/symbol to spaces, preserve diacritics and
numbers, collapse whitespace, no stopword removal, no stemming, no translation,
no token sorting, and no CJK segmentation. The repository stores
`display_title`, `normalized_title`, and `title_normalizer_version`; an optional
hash may be added later for exact-match acceleration, but the text remains the
primary stored value.

Lifecycle values for `synt_literature_item.status` are:

```text
active | inactive | unavailable | pending_delete_review | tombstoned | purge_eligible | purged
```

Merge / redirect state is recorded without rewriting the primary key. Downstream
tables reference `literature_item_id`; P0 review actions may retarget dependent
rows in bounded transactions.

## Index UI Contract

Index 默认顶层显示 active Zotero-bound literature items。References 作为展开层显示 `reference_instance`，不是和库内文献平铺。

Index 需要支持：

- 默认库内文献视图；
- 展开 source item 后显示 references；
- `Only referenced literature` 模式；
- reference match / Zotero deletion / duplicate merge review card；
- concise badges + expandable details / inspector。

Review card 必须解释用户在决策什么、来源文献是什么、reference 内容是什么、目标实体是什么，以及动作会如何改变 Index / Citation Graph。

## Review Dependency and Transaction Semantics

Index review queue 有层级：

- P0：identity / binding review，包括 Zotero deletion、Zotero dedupe / merge、literature item merge / keep separate。
- P1：reference resolution review，包括 match existing、create external item、ignore reference。
- P2：metadata / freshness / diagnostics review。

P0 未解决时，依赖相关 source / target item 的 P1 review 不应作为可操作 card 展示。P0 action 成功后必须执行 bounded review dependency maintenance：resolve redirects、retarget reviews、supersede invalid reviews、unblock resolved dependencies、dedupe duplicated reviews。

Review action 成功不能只更新 `review_item.status`。它必须在同一 SQLite transaction 中更新领域事实、review 状态、Index summary、Citation Graph structure / lightweight metrics，以及下游 dirty signal。

Phase 1 only creates the review table and dependency fields. Phase 2 implements
the domain actions. The transaction contract for Phase 2+ is:

```text
BEGIN
  update domain fact rows
  update or close review rows
  maintain bounded dependent review rows
  update affected Index summary / graph structure dirty effects
  record diagnostics and dirty events
COMMIT
```

Blocked P1 review rows remain queryable for diagnostics but SHALL NOT be
returned as the current actionable review card while their P0 dependency is
open.

## Lifecycle and Deletion

`literature_item` 生命周期采用有限 tombstone，而不是永久保留：

```text
active -> inactive / unavailable -> tombstoned -> purge_eligible -> purged
```

普通 tombstone 建议 90 天后 eligible；merge / redirect tombstone 至少保留 180 天。仍有 unresolved review、reference、topic usage 或 redirect 依赖的 tombstone 不进入 purge。

Zotero 管理的 digest note / attachment / embedded-image 不属于插件文件生命周期。插件只维护 artifact metadata、availability 和 diagnostics，不物理删除 Zotero 管理资产。

`data/synthesis/` 的 checkpoint / export 可由专门 checkpoint cleanup 处理；普通 runtime cleanup 不应混删。

JSON cold-path import / export is explicit tooling. Normal repository writes in
Phase 1 and Phase 2 SHALL NOT write one JSON file per changed domain row.
Startup SHALL NOT import existing JSON automatically. Import tooling may
dry-run, apply, or verify existing `data/synthesis/` assets in later phases;
checkpoint export serializes SQLite state back to canonical JSON only when an
explicit command is invoked.

## Citation Graph

Citation Graph structure 是 Index 的 DB-native 异构投影。任何影响 `literature_item`、Zotero binding、reference instance 或 reference resolution 的 Index 写事务，都必须同步更新受影响 graph structure 和 lightweight metrics。

Complex metrics 由低优先级 worker 更新。Layout 只由 Graph UI 或显式 recompute 触发。Read APIs 返回 bounded DB DTO，不组装全量 graph JSON。

## Topic Freshness and Discovery

Topic freshness 分两类：

- known dependency freshness：已关联 literature item 变化；
- discovery freshness：新增或更新 literature item 可能与某 topic 相关。

Read path 只能读取已有 freshness / hints，不能扫描、resolver、BM25 discovery 或刷新状态。新增未关联文献不应把所有 topic 标记 stale，而应通过 matching metadata + BM25 discovery 生成 candidate hints。

## BM25 / Metadata Minimal Contract

V1 metadata 合同保持最小：

`literature_matching_metadata`：

- `key_terms`
- `methods`
- `problems`
- `datasets`
- `exclude_terms`

`topic_interest_metadata`：

- `include_terms`
- `must_have_terms`
- `methods`
- `exclude_terms`
- `seed_literature_item_ids`

插件把 metadata、title、normalized title 和 Zotero tags 组装成 search document / topic query。Hint 只用于 UI 提示和 resolver prefilter，不自动改写 topic。

## Background Job Model

Worker 只消费 DB dirty queue，并必须遵守 batch / time budget。Unsafe scope 只标记 broader state stale 并推荐显式 repair，不自动 fallback full rebuild。

Worker 需要记录 job state、retry、processed / failed counts、sanitized diagnostics。实现阶段应优先避免 job 退化成全量扫描。

## Debug-only Job Profiler

后台 job profiler 只在项目已有 debug mode 开启时启用，不新增 prefs 或用户 UI。关闭时必须近似零开销 no-op。

Profiler 使用独立 DB：`state/debug/synthesis-job-profiler.db`，不写主业务库，不参与 checkpoint / sync / migration，也不设计 TTL / cleanup。它只覆盖后台 job，不覆盖 UI profiler。

## Implementation Split

本 change 是大型架构重设，应按子阶段实现。阶段边界见：

- `artifact/synthesis_persistence_redesign_implementation_principles_20260526.md`
- `artifact/synthesis_persistence_redesign_phase_plan_20260526.md`
