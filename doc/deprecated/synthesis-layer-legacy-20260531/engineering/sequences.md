# Synthesis Sequences

本文档定义跨领域流程的 canonical 时序。YAML rebuild 合同见 [rebuild-contracts.yaml](./schemas/rebuild-contracts.yaml)，事件合同见 [events.yaml](./schemas/events.yaml)。

## `seq.index.incremental_item_update`

当前 sequence ID 保留历史 `index` 名称；目标语义是增量 paper registry cache update。新 Zotero 条目或 artifact note 变化进入增量 registry cache。未 materialize 到 registry cache 的条目不得触发 topic freshness；没有 literature-digest apply 的条目也不得触发 discovery。

```mermaid
sequenceDiagram
  participant Z as Zotero / Artifact Source
  participant Q as Dirty Event Queue
  participant W as Registry Cache Worker
  participant R as Synthesis Repository
  participant G as Citation Graph Worker
  participant M as Discovery Matcher
  participant UI as Workbench

  Z->>Q: evt.index.paper_dirty
  Q->>W: start bounded event
  W->>R: upsert literature item, binding, artifacts
  W->>R: upsert reference instances/resolutions
  W->>Q: enqueue graph structure dirty
  alt mutation includes literature-digest apply
    W->>R: upsert literature matching metadata
    W->>M: run apply-time discovery for this literature only
    M->>R: upsert bounded hints / preserve filtered pairs
  else no digest matching metadata
    W-->>M: no discovery work
  end
  W->>Q: complete event
  UI->>R: read DB-backed snapshot
```

## `seq.topic.discovery_apply_time_match`

Discovery 是 literature-digest apply 后的单篇 best-effort 匹配，不是全库后台检索。

```mermaid
sequenceDiagram
  participant A as Literature Digest Apply
  participant R as Repository
  participant M as Discovery Matcher
  participant UI as Topics UI

  A->>R: upsert literature matching metadata
  A->>M: match this literature against active topics
  M->>R: read topic interest metadata
  M->>R: upsert bounded open hints
  M->>R: preserve filtered pairs
  UI->>R: read discovery hints separately from freshness
```

## `seq.index.full_rebuild`

当前 sequence ID 保留历史 `index` 名称；目标语义是 full registry/graph cache rebuild。它是受保护动作，必须处理旧 epoch/basis、saved override preservation、graph rebuild 和 progress。

```mermaid
sequenceDiagram
  participant UI as UI / Host Bridge
  participant S as Synthesis Service
  participant Q as Dirty Event Queue
  participant O as Saved Overrides
  participant R as Repository
  participant G as Graph Workers

  UI->>S: request full rebuild with approval
  S->>S: validate confirmation / capability approval
  S->>R: prepare registry_epoch / rebuild run
  S->>Q: supersede old registry/graph/topic-discovery repair jobs
  S->>R: rebuild registry cache rows without exposing partial ready state
  S->>O: preserve durable effects and detect orphan conflicts
  O-->>S: preserved / needs_attention / cleared
  S->>G: rebuild graph structure + light metrics with basis registry_epoch
  S->>R: final short transaction advances registry_epoch / graph_epoch
  S->>R: persist summary and job progress
  UI->>R: refresh Workbench snapshot
```

## `seq.startup.external_source_reconcile`

Startup reconcile 是 bounded detector。它先分类 Zotero external source drift，再决定是否允许增量入队。

```mermaid
sequenceDiagram
  participant Z as Zotero Library / Artifact Notes
  participant S as Startup Reconcile
  participant R as Repository
  participant Q as Dirty Event Queue
  participant UI as Workbench

  S->>Z: scan metadata fingerprints within budget
  S->>R: compare committed bindings and fingerprints
  alt small safe drift
    S->>Q: enqueue bounded registry cache dirty events
    S->>R: record reconcile summary
  else bulk drift
    S->>R: record bounded source drift incident
    S->>R: recommend explicit registry/graph cache rebuild
  else structural drift
    S->>R: record structural drift incident
    S->>Q: pause/suppress incremental fan-out
    S->>R: require inspect/repair
  end
  S-->>R: do not write topic source-check state
  S-->>Q: do not enqueue topic work or discovery backscan
  UI->>R: read bounded drift summary and recommended commands
```

## `seq.review.apply_action`

Review action 必须 materialize domain facts，并产生后续 dirty events，而不是只改 review 状态。

```mermaid
sequenceDiagram
  participant UI as Workbench Review UI
  participant S as Domain Service
  participant R as Repository
  participant O as Saved Overrides
  participant Q as Dirty Event Queue

  UI->>S: apply review action
  S->>R: load review item and evidence
  S->>R: compare evidence hash / target version
  alt stale guard passes
    S->>O: create/update durable effect when action is durable
    S->>R: materialize domain facts
    S->>Q: enqueue downstream invalidation events
    S->>R: mark review resolved/superseded
    S-->>UI: result summary + affected domains
  else evidence or target changed
    S->>R: do not write durable effect or domain facts
    S->>R: create Needs Attention or supersede stale review
    S-->>UI: conflict_requires_attention
  end
```

Stale guard 失败时返回 `conflict_requires_attention`，不得继续 materialize 旧 evidence 的 action。Evidence hash 只保护 action moment，不会让 saved override 在 rebuild 后失效。

## `seq.graph.related_items_sync`

Zotero native related items sync 是 Citation Graph 的外部副作用，不是 graph 输入事实。该 worker 只补缺失 link，不删除用户已有 related links。

```mermaid
sequenceDiagram
  participant G as Citation Graph / Routing Policy
  participant Q as Dirty Event Queue
  participant W as Related Items Sync Worker
  participant R as Repository
  participant Z as Zotero Library
  participant UI as Workbench / Debug

  G->>Q: evt.graph.related_items_sync_dirty
  Q->>W: start bounded sync event
  W->>R: read matched library-to-library edges
  W->>R: filter active source/target Zotero bindings
  loop each missing native related link
    W->>Z: add related item link if absent
    Z-->>W: added / existing / failed
  end
  W->>R: write sync summary and diagnostics
  W->>Q: complete event
  UI->>R: read added/existing/skipped/failed counts
```

约束：

- Worker 不得读取 Zotero related items 作为 reference resolution 或 citation graph 输入。
- Worker 不得删除 Zotero native related links。
- Zotero API 写入失败只影响 sync diagnostic/job state，不回滚 graph facts。

## `seq.worker.interrupted_run_recovery`

Zotero/plugin 进程中断后，running event/job 不得永久残留。

```mermaid
sequenceDiagram
  participant W as Worker
  participant R as Repository
  participant M as Startup Maintenance

  W->>R: mark event running with run_id + updated_at
  W--xR: Zotero/plugin exits before final commit
  M->>R: scan previous-session running rows
  M->>R: requeue, failed_retryable, failed_terminal, or superseded
  W-->>R: late final commit
  R-->>W: stale run marker/basis no-op or rejected
```

## `seq.topic.source_check`

Topic source check 是显式诊断，不由 registry cache dirty events 自动触发，也不把 discovery candidate 当作 stale。

```mermaid
sequenceDiagram
  participant U as User / Debug Command
  participant R as Repository
  participant F as Source Check Worker
  participant UI as Topics UI

  U->>F: request source check for topic
  F->>R: read topic dependency baseline
  F->>R: read current Host Library / Artifact Facade snapshot
  F->>R: compare saved source refs and artifact availability
  F->>R: write source check diagnostic
  UI->>R: read coverage, freshness, discovery separately
```

## `seq.reset.clean_install`

Clean-install reset 是危险操作，必须明确是否清 saved overrides 和 file residue。

```mermaid
sequenceDiagram
  participant UI as Prefs / Debug UI
  participant S as Synthesis Service
  participant R as Repository
  participant FS as Runtime Files
  participant UI2 as Workbench

  UI->>S: clean-install reset with fixed phrase
  S->>S: validate confirmation
  S->>R: clear Synthesis runtime tables by scope
  S->>FS: delete Synthesis file residue by explicit reset policy
  S->>R: keep DB file and schema meta
  S-->>UI: deleted rows/files summary
  UI2->>R: next snapshot is empty DB state
```

## `seq.import.preview_apply`

Import 必须 preview-first，不得把文件 bundle 当 Workbench 热路径。

```mermaid
sequenceDiagram
  participant U as User
  participant S as Import Service
  participant B as File Bundle
  participant R as Repository
  participant O as Saved Overrides

  U->>S: import preview
  S->>B: read explicit bundle
  S->>R: compare DB state
  S->>O: compare saved override policy
  S-->>U: dry-run diff
  U->>S: apply confirmed import
  S->>R: transactionally write DB facts
  S->>O: import saved overrides according to policy
  S-->>U: import result summary
```
