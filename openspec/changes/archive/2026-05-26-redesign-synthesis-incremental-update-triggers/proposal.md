## Why

Synthesis read paths can still discover stale or missing projections and enqueue
background rebuild work, which makes UI, MCP, and CLI reads capable of starting
large library jobs. This is unsafe for large Zotero libraries and needs to be
replaced with an explicit, event-driven incremental update model.

## What Changes

- Make Synthesis read paths side-effect free: reads may return diagnostics and
  process-local hints, but SHALL NOT enqueue rebuilds, write projection/job
  state, or start retry timers.
- Add a durable Synthesis update event journal and dirty queue for automatic
  work from Zotero item changes, workflow apply hooks, and explicit commands.
- Convert Paper Registry maintenance from rebuild-first projection behavior to
  facet-based incremental updates with startup lightweight reconcile.
- Split Citation Graph maintenance into structure/lightweight metrics, complex
  metrics, and on-demand UI layout refresh.
- Let Topic freshness follow Paper Registry changes while keeping topic artifact
  rewriting and semantic Topic Graph edge changes explicit.
- Change Git Sync autosync to wait for canonical update workers to drain and use
  a large debounce window for maintenance-driven canonical mutations.
- Keep full rebuilds as explicit repair/recovery commands, not normal read-time
  behavior.

## Capabilities

### New Capabilities

- `synthesis-incremental-update-triggers`: Defines the event journal, dirty
  queue, worker budget, read-path purity, startup reconcile, and canonical
  mutation epoch contracts for Synthesis automatic updates.
- `synthesis-literature-registry-citation-graph`: Aligns literature registry
  and citation graph background work with the new event-driven incremental
  trigger model. This capability exists in a completed but unarchived KG change
  and is declared here so this change validates independently.
- `synthesis-git-sync`: Defines maintenance-driven autosync behavior with
  canonical worker drain and large debounce. This capability exists in completed
  but unarchived Git Sync changes and is declared here so this change validates
  independently.

### Modified Capabilities

- `synthesis-paper-registry`: Changes Paper Registry requirements from
  rebuildable projection only to facet-based incremental maintenance with
  startup reconcile and explicit full rebuild fallback.
- `synthesis-citation-graph`: Splits graph structure, lightweight metrics,
  complex metrics, and layout freshness; read methods remain bounded and
  side-effect free.
- `synthesis-mcp-tools`: Clarifies that MCP read-only Synthesis tools SHALL NOT
  enqueue rebuilds or mutate projection/job state.
- `synthesis-workbench-ui`: Exposes freshness, dirty queue, worker, and latest
  usable state without causing reads or UI interactions to trigger rebuilds.

## Impact

- Affects Synthesis service read methods, literature registry and citation graph
  workers, Paper Registry state, Workbench snapshot/UI model, MCP/Host Bridge
  read tools, Git Sync autosync scheduling, and tests around rebuild side
  effects.
- Does not include migrated test data enrichment, production migration,
  SQLite/FTS/BM25 backend implementation, new dependencies, or topic artifact
  auto-rewriting.
