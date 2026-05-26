## 1. Read-Path Safety

- [x] 1.1 Audit Synthesis UI, MCP, CLI, and service read paths for rebuild enqueue, projection writes, job state writes, retry scheduling, and whole-library scans.
- [x] 1.2 Change `getPaperRegistry()` so stale or missing projection state returns bounded diagnostics and recommended commands without calling `queueLiteratureRegistryRebuild()`.
- [x] 1.3 Ensure `queryCitationGraph()`, `getCitationGraphSlice()`, and `getCitationGraphMetrics()` do not start structure, metrics, layout, or registry rebuild work from reads.
- [x] 1.4 Add process-local read hint support for stale/missing reads without durable writes or worker enqueue.
- [x] 1.5 Add regression tests proving MCP, CLI-capability, Workbench snapshot, and service read calls do not mutate job/projection state.

## 2. Update Event Journal and Dirty Queue

- [x] 2.1 Add durable Synthesis update event DTOs and storage for event type, source, scope, source hash, status, attempt, retry time, and diagnostics.
- [x] 2.2 Implement dirty-scope coalescing for paper, work, reference, topic, citation structure, and layout scopes.
- [x] 2.3 Add pause/resume, retry/backoff, pending count, and latest failure state for automatic Synthesis maintenance workers.
- [x] 2.4 Add startup lightweight reconcile event state and user-visible checking/queued/ready/failure statuses.
- [x] 2.5 Add tests for event coalescing, pause/resume, retry scheduling, and no processing while paused.

## 3. Paper Registry Incremental Maintenance

- [x] 3.1 Split Paper Registry row state into identity, metadata, artifact, reference, readiness, and topic usage facets with independent hashes.
- [x] 3.2 Implement Zotero item dirty events for add, update, delete, and restore without performing inline registry rebuilds.
- [x] 3.3 Implement literature-digest and reference-matching apply hooks that record scoped paper/reference dirty events and return without waiting for downstream work.
- [x] 3.4 Implement startup lightweight reconcile over Zotero item identity and metadata fingerprints, with toast/status reporting and no artifact parsing.
- [x] 3.5 Implement the Paper Registry incremental worker with bounded batches, latest usable data preservation, and explicit full rebuild fallback.
- [x] 3.6 Add tests for facet invalidation, scoped dirty updates, startup reconcile, digest apply dirty events, and explicit full rebuild behavior.

## 4. Citation Graph Structure and Metrics

- [x] 4.1 Represent citation structure ownership so source-paper outgoing edges and affected target/work edge groups can be recomputed independently.
- [x] 4.2 Implement incremental citation structure updates from paper reference facet and work resolution dirty scopes.
- [x] 4.3 Update lightweight metrics with structure work when possible, including degree-like counts and resolution summaries.
- [x] 4.4 Implement low-priority complex metrics worker with stale/partial/ready status and latest usable metrics preservation.
- [x] 4.5 Add tests for one-paper reference updates, work resolution updates, stale complex metrics, and read methods returning bounded diagnostics without rebuild.

## 5. Citation Graph Layout on Demand

- [x] 5.1 Add layout freshness based on `source_graph_hash` and complex metrics freshness.
- [x] 5.2 Trigger layout work only from Graph UI open or explicit recompute command, never from MCP/CLI metrics or slice reads.
- [x] 5.3 Refresh stale complex metrics before or during layout work when Graph UI requires them.
- [x] 5.4 Update Workbench graph state to show latest usable graph immediately and refresh after background layout completion.
- [x] 5.5 Add tests for stale layout UI behavior, no layout work from read-only tools, and explicit recompute commands.

## 6. Topic Freshness

- [x] 6.1 Map Paper Registry topic usage facets to affected topics for freshness updates.
- [x] 6.2 Refresh topic freshness, coverage, readiness, and update availability from affected paper facets under worker budget.
- [x] 6.3 Ensure topic freshness work never rewrites topic artifacts, submits workflows, or changes semantic Topic Graph relations.
- [x] 6.4 Update Workbench topic UI state to distinguish fresh, stale, partial, missing, queued, running, and failed states.
- [x] 6.5 Add tests for paper changes marking affected topics stale and for no topic artifact rewrite during freshness updates.

## 7. Git Sync Canonical Epoch

- [x] 7.1 Track active canonical maintenance workers and canonical mutation epoch dirty state.
- [x] 7.2 Delay maintenance-driven Git Sync until canonical workers drain and a large debounce window elapses.
- [x] 7.3 Ensure projection rebuilds, job state writes, read hints, metrics, layout, and freshness-only state do not trigger Git Sync.
- [x] 7.4 Keep manual sync available with pending-worker diagnostics and existing pause/conflict/lock gates.
- [x] 7.5 Add tests for coalesced maintenance-driven sync, no sync from projection/job writes, and manual sync diagnostics during active maintenance.

## 8. UI, MCP, and Documentation

- [x] 8.1 Expose maintenance state in Workbench snapshots: latest usable age, pending dirty count, active worker kind, last failure, stale/partial/missing status, and recommended commands.
- [x] 8.2 Keep MCP and Host Bridge DTOs bounded and read-only while including freshness diagnostics and recommended commands.
- [x] 8.3 Update `doc/synthesis-layer-trigger-map.md` to reflect the new event-driven trigger behavior.
- [x] 8.4 Add or update focused tests for Workbench snapshot purity, MCP read-only purity, Host Bridge synthesis read calls, and maintenance state rendering.

## 9. Validation

- [x] 9.1 Run `openspec validate "redesign-synthesis-incremental-update-triggers" --strict`.
- [x] 9.2 Run targeted core tests for Synthesis paper registry, citation graph, MCP tools, Workbench UI, Git Sync, and persistence governance.
- [x] 9.3 Run `npx tsc --noEmit`.
- [x] 9.4 Run Prettier check for changed TS/MD/JSON files.
