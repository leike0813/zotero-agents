# Synthesis State Machines

This document defines the active Synthesis state machines. It is the human-readable companion to `contracts/states-and-events.yaml`.

The hard-cut model does not keep background synchronization state machines. Dirty events, WorkItems, WorkRuns, startup reconcile, queue drain, and Registry rebuild runs are removed implementation targets, not active lifecycle objects.

Runtime state has two active sources:

- `synt_operation` records explicit command progress and terminal diagnostics.
- `synt_cache_basis` records data readiness for Reference Sidecar, Citation Graph cache, layout, and other regenerable projections.

Terminal operation state does not imply data readiness. A completed operation is only history unless the corresponding cache basis was promoted; a failed operation must not override a previous ready cache basis. Legacy state/projection files are not state machines.

## Machine Index

| Machine ID | Owner | Object | Main Risk |
| --- | --- | --- | --- |
| `sm.reference.canonical` | Reference sidecar service | Canonical reference | Refresh fragments or merges referenced works incorrectly |
| `sm.reference.binding` | Reference binding review | Canonical reference binding | Cached binding overrides current Zotero truth |
| `sm.topic.discovery_hint` | Topic discovery service | Topic-literature hint | Rejected pairs reopen unexpectedly |
| `sm.review.item` | Domain services | Current review item | Current issue is mistaken for durable override |
| `sm.override.durable_effect` | Domain services | Durable user decision | Cache refresh silently drops user decisions |
| `sm.cache.projection` | Sidecar cache service | Cache projection | Stale cache is mistaken for Zotero Library truth |
| `sm.operation.explicit` | Explicit operation service | User/debug-triggered operation | Operation becomes a hidden worker queue |
| `sm.topic.source_check` | Topic source-check service | Source-check diagnostic | Cache refresh marks topic changed |
| `sm.sync.git` | Git Sync service | Durable exchange run | Live SQLite or conflicting durable facts are imported unsafely |
| `sm.import.lifecycle` | Import/export service | Import run | Bundle writes sidecar state before preview |

## `sm.reference.canonical`

Owner: Reference sidecar service.

Object: Synthesis-owned canonical reference row.

```mermaid
stateDiagram-v2
  [*] --> active: extracted or matched
  active --> merged: canonical redirect accepted
  active --> deprecated: source evidence no longer active
  active --> needs_attention: identity conflict
  merged --> active: explicit split or retarget
  deprecated --> active: active raw reference reappeared
  needs_attention --> active: explicit keep or retarget
  needs_attention --> merged: explicit merge
  needs_attention --> deprecated: explicit drop
```

Allowed transitions:

- `active -> merged` from deterministic safe dedupe or explicit review.
- `active -> deprecated` when no active raw reference or binding decision still needs that canonical row.
- `needs_attention -> active/merged/deprecated` only after explicit review, repair, or import policy.

Forbidden transitions:

- Refresh silently deleting a canonical reference that still has active raw references or durable binding decisions.
- `merged -> active` without explicit split, retarget, or import policy.

## `sm.reference.match_proposal`

Owner: Reference matching review.

Object: Advanced matcher proposal for a Zotero binding or canonical merge.

```mermaid
stateDiagram-v2
  [*] --> open: generated suggestion
  open --> accepted: user approves
  open --> rejected: user rejects
  open --> superseded: source or target basis changed
  rejected --> open: explicit reopen
  rejected --> accepted: explicit accept after review
  rejected --> superseded: explicit delete
  accepted --> open: explicit reopen and revoke fact
  accepted --> rejected: explicit reject and revoke fact
  accepted --> superseded: explicit delete or accepted fact replaced by newer basis
```

Allowed transitions:

- `open -> accepted/rejected` requires explicit review.
- `open -> superseded` is allowed when source or target basis changed.
- `rejected -> open/accepted/superseded` requires explicit user action or a new basis.
- `accepted -> open/rejected/superseded` requires explicit user action and revokes
  the accepted binding/redirect fact when that fact was created from the proposal.

Forbidden transitions:

- Cache refresh silently accepting or deleting a proposal.
- Refresh/rebuild changing accepted or rejected proposal decisions without an
  explicit user action.
- Proposal state changing topic artifact freshness by itself.

## `sm.topic.discovery_hint`

Owner: Topic discovery service.

Object: One topic-literature discovery hint.

```mermaid
stateDiagram-v2
  [*] --> open: apply-time token overlap
  open --> rejected: user rejects
  rejected --> open: explicit restore or force repair
  open --> superseded: identity removed
  rejected --> superseded: identity removed
```

Forbidden transitions:

- `rejected -> open` from digest rerun, metadata hash drift, cache refresh, or graph cache rebuild.
- Any discovery state transition writing topic source-check state.

## `sm.review.item`

Owner: Domain services.

Object: Current review item.

```mermaid
stateDiagram-v2
  [*] --> open
  open --> deferred: defer
  open --> resolved: apply action
  open --> rejected: reject
  open --> blocked_by_upstream_review: upstream blocker
  deferred --> open: reopen
  blocked_by_upstream_review --> open: blocker resolved
  open --> superseded: source state changed
  deferred --> superseded: source state changed
  resolved --> superseded: newer effect
  rejected --> superseded: newer evidence
```

Forbidden transitions:

- `resolved -> open`; create a new review item instead.
- `superseded -> resolved`.

## `sm.override.durable_effect`

Owner: Domain services.

Object: Durable user decision or saved effect.

```mermaid
stateDiagram-v2
  [*] --> active
  active --> preserved: cache refresh preserves
  preserved --> active: visible in snapshot
  active --> needs_attention: orphan or hard conflict
  needs_attention --> active: explicit keep or retarget
  needs_attention --> revoked: explicit drop
  active --> revoked: user revokes
  active --> orphaned: scope disappeared
```

Forbidden transitions:

- `active -> revoked` from ordinary digest metadata change or cache refresh.
- `preserved -> revoked` without reset, import, or explicit action.

## `sm.cache.projection`

Owner: Sidecar cache service.

Object: A regenerable sidecar projection, such as artifact existence summary, reference cache, graph structure, graph metrics, or layout. Runtime status is stored in `synt_cache_basis`.

```mermaid
stateDiagram-v2
  [*] --> missing
  missing --> refreshing: explicit operation or workflow apply sync
  stale --> refreshing: explicit operation
  refreshing --> ready: validation passed
  refreshing --> failed: refresh failed
  ready --> stale: basis invalidated
  failed --> refreshing: explicit retry
  stale --> missing: reset
```

Allowed transitions:

- `missing/stale -> refreshing` only from workflow apply sync, explicit cache refresh, explicit graph incremental refresh, explicit repair, protected import, or scoped debug command.
- `refreshing -> ready` only after validation for the recorded basis.

Forbidden transitions:

- `stale -> topic source changed`.
- `missing -> block literature-analysis`.
- `refreshing -> mutate Zotero Library metadata`.

## `sm.operation.explicit`

Owner: Explicit operation service.

Object: A user/debug-triggered or workflow-triggered visible operation such as reference sidecar refresh, citation graph cache incremental refresh, citation graph cache rebuild, citation graph layout rebuild, reference binding review, related-items sync, import, export, or reset. Runtime progress is stored in `synt_operation`.

```mermaid
stateDiagram-v2
  [*] --> submitted
  submitted --> running: command starts
  running --> waiting: yielded at slice boundary
  waiting --> running: explicit continue
  running --> completed: success
  running --> failed: failure
  running --> cancelled: user cancels
  failed --> running: explicit retry
  completed --> archived
  failed --> archived
  cancelled --> archived
```

Allowed transitions:

- `running -> waiting` stores bounded progress and returns control to Zotero UI.
- `waiting -> running` requires an explicit continue/retry command or operation-local controlled loop.

Forbidden transitions:

- Operation rows being claimed by owner workers.
- Global queue pause/resume/drain controlling operations.
- Startup replaying old operations as hidden work.
- Terminal operation rows becoming cache readiness without a matching `synt_cache_basis` promotion.

## `sm.ui.workbench_surface`

Owner: Synthesis Workbench UI.

Object: Shell/Chrome/Surface read model for one Workbench area.

```mermaid
stateDiagram-v2
  [*] --> missing
  missing --> loading: surface requested
  loading --> ready: surface read model returned
  loading --> failed: surface read failed
  ready --> stale: operation or Zotero Library read-model invalidation marks surface dirty
  stale --> loading: visible surface reload
  failed --> loading: retry or revisit
```

Allowed transitions:

- `ready -> stale` from a completed operation that invalidates the surface.
- `ready -> stale` from a Zotero item notification that invalidates the direct-read library metadata shown by a surface, such as Index rows.
- `missing/stale/failed -> loading` from startup warmup, visible tab selection, or explicit refresh.

Forbidden transitions:

- `loading -> full snapshot refresh`.
- Chrome progress update refreshing a content surface.
- Surface-local UI state clearing the Workbench root DOM.
- Zotero Library metadata dirty changing Reference Sidecar or Citation Graph `synt_cache_basis` readiness.

## `sm.topic.source_check`

Owner: Topic source-check service.

Object: Topic source-check diagnostic.

```mermaid
stateDiagram-v2
  [*] --> not_checked
  not_checked --> running: explicit request
  fresh --> running: explicit request
  changed --> running: explicit request
  missing_source --> running: explicit request
  running --> fresh: no source differences
  running --> changed: changed source
  running --> missing_source: source unavailable
  running --> error: failed check
  error --> running: retry
  fresh --> superseded: topic artifact replaced
  changed --> superseded: topic artifact replaced
  missing_source --> superseded: topic artifact replaced
  error --> superseded: topic artifact replaced
  fresh --> cleared: topic deleted
  changed --> cleared: topic deleted
  missing_source --> cleared: topic deleted
  error --> cleared: topic deleted
```

Forbidden transitions:

- Cache refresh directly entering `running`.
- Discovery hint writing `changed`.

## `sm.import.lifecycle`

Owner: Import/export service.

Object: Import run.

```mermaid
stateDiagram-v2
  [*] --> validating
  validating --> previewing: manifest and asset hashes valid
  validating --> failed: invalid path, hash, schema, or manifest
  previewing --> preview_ready: dry-run diff built
  previewing --> blocked_conflict: conflict gate blocks
  preview_ready --> applying: user confirms or Git Sync auto-apply allowed
  preview_ready --> cancelled: user cancels
  blocked_conflict --> previewing: manual edit or resolution clears blocker
  applying --> stale_projection: durable facts committed
  stale_projection --> applied: rebuildable projections marked stale
  applying --> failed: write failure
  failed --> validating: retry preview
```

Forbidden transitions:

- `validating -> applying` without preview result.
- `blocked_conflict -> applying` without an explicit resolution action.
- Importing a file bundle by making it a Workbench hot path.

## `sm.sync.git`

Owner: Git Sync service.

Object: One Git durable-state exchange run.

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> syncing: queued or manual sync
  syncing --> validating: fetch/merge completed
  validating --> blocked_conflict: durable conflict gate blocks
  validating --> failed_permanent: invalid manifest, path, hash, or schema
  validating --> applying: preview clean
  applying --> idle: import applied and projections marked stale
  syncing --> failed_retryable: adapter or network failure
  failed_retryable --> syncing: retry
  blocked_conflict --> idle: user keeps local or saves remote copy
  blocked_conflict --> syncing: user clears after manual edit
```

Forbidden transitions:

- `validating -> applying` when durable preview reports conflicts.
- `applying -> import live SQLite`.
- `blocked_conflict -> idle` by silently choosing last-writer-wins.

## State Combination Governance

These machines are orthogonal. Do not collapse identity, review, durable effect, cache, operation, and import state into one giant status.

Rules:

1. Cache state is never a Zotero fact: `ready`, `stale`, `missing`, `refreshing`, and `failed` describe sidecar projections only.
2. Explicit operation state is never a domain fact: `running`, `waiting`, and `failed` cannot make a half-computed result appear committed.
3. Discovery and source check are separate: discovery hints never change topic source-check state.
4. Durable user decisions win over transient review items and cache refresh output.
5. Current Zotero Library reads win over cached Zotero metadata whenever correctness matters.
6. Reference sidecar refresh, citation graph cache incremental refresh, and citation graph cache rebuild are different operations; layout rebuild is a fourth operation scoped to coordinates only.
