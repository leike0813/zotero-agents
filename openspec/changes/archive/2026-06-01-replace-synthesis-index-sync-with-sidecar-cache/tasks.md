## 1. Contract Hard Cut

- [x] 1.1 Update active Synthesis docs to remove legacy/transition wording for dirty events, WorkItems, WorkRuns, startup reconcile, Registry rebuild, and queue drain.
- [x] 1.2 Update `doc/synthesis-layer/contracts/states-and-events.yaml` to remove legacy work/rebuild state machines and define explicit operation/cache state only.
- [x] 1.3 Update `doc/synthesis-layer/contracts/invariants.yaml` so old sync machinery is forbidden, not merely deprecated.
- [x] 1.4 Update Host Bridge CLI/MCP documentation to label registry/graph reads as cache views and direct current Zotero facts to direct library/artifact reads.
- [x] 1.5 Verify OpenSpec delta specs and active docs agree on Zotero Library SSOT, sidecar cache, explicit operations, and destructive schema cutover.

## 2. Repository Schema Cutover

- [x] 2.1 Replace Synthesis schema initialization with sidecar cache, explicit decision, and explicit operation tables.
- [x] 2.2 Drop creation and memory-adapter support for `synt_dirty_event`, `synt_job_state`, `synt_work_item`, `synt_work_run`, `synt_work_queue_meta`, and `synt_registry_rebuild_run`.
- [x] 2.3 Remove repository APIs for dirty events, WorkItems, WorkRuns, queue meta, worker claiming, stale work cleanup, and job projection.
- [x] 2.4 Add repository APIs for artifact projections, reference entries, binding decisions, graph cache basis/rows, explicit operation progress, and bounded operation listing.
- [x] 2.5 Add destructive schema reset behavior that removes old synchronization tables without replaying or migrating their rows.

## 3. Service Runtime Cleanup

- [x] 3.1 Delete `updateEvents.ts` usage and remove `recordSynthesisUpdateEvent`, `runSynthesisStartupReconcile`, `runSynthesisWorkDrainOnce`, queue pause/resume/retry, and queue failure APIs from the Synthesis service.
- [x] 3.2 Remove paper registry incremental worker, citation graph structure/metrics/layout workers, topic freshness worker, topic discovery worker queue paths, and related-items dirty worker paths.
- [x] 3.3 Replace Registry rebuild service methods with explicit reference sidecar cache refresh and citation graph cache refresh operations.
- [x] 3.4 Ensure startup initializes repository/cache status only and does not scan Zotero Library, enqueue work, or start refresh.
- [x] 3.5 Ensure cache refresh operations yield between bounded slices and preserve previous active cache on failure.

## 4. Workflow Apply Paths

- [x] 4.1 Rewrite literature digest apply hook to direct-write sidecar artifact projections, reference entries, and matching metadata for the affected Zotero item.
- [x] 4.2 Rewrite reference matching apply hook to write explicit binding/review decisions instead of recording Synthesis update events.
- [x] 4.3 Remove workflow tests and mocks that require `recordSynthesisUpdateEvent`.
- [x] 4.4 Ensure digest/reference apply does not start citation graph refresh; it only marks cache status or records operation recommendations when needed.

## 5. Workbench and Host Bridge

- [x] 5.1 Replace Workbench maintenance/background job projection with cache status, explicit operation rows, and bounded review surfaces.
- [x] 5.2 Remove WorkItem/WorkRun types and UI labels from `uiModel.ts` and `synthesisWorkbenchApp.ts`.
- [x] 5.3 Remove Host Bridge debug queue/work controls and replace them with cache/operation diagnostics.
- [x] 5.4 Reclassify or rename `get-library-index` and `get-reference-sidecar-index` surfaces so they are cache views, not synchronized library indexes.
- [x] 5.5 Ensure MCP read tools return cache diagnostics without starting refresh or writing operation rows.

## 6. Reference, Graph, and Related Items

- [x] 6.1 Rework reference resolution persistence so graph-affecting state comes only from deterministic safe apply or explicit user-approved binding decisions.
- [x] 6.2 Rebuild citation graph cache from sidecar references, binding decisions, and direct Zotero binding checks.
- [x] 6.3 Remove `registry_epoch` as a runtime truth marker; replace graph cache basis with source artifact/binding decision/cache policy basis.
- [x] 6.4 Make related-items sync an explicit provenance-protected operation that reads current Zotero relation state before writing.
- [x] 6.5 Ensure graph cache refresh never marks topics changed, starts topic discovery, or affects topic source-check state.

## 7. Tests and Validation

- [x] 7.1 Delete or rewrite update-event/startup-reconcile/WorkItem tests, especially `test/core/145-synthesis-update-events.test.ts`.
- [x] 7.2 Rewrite Registry/Graph tests around sidecar cache refresh, explicit operation progress, stale cache diagnostics, and failure preserving previous cache.
- [x] 7.3 Update Workbench UI tests to assert no background queue projection and no refresh from snapshot reads.
- [x] 7.4 Add regression coverage that startup performs no Synthesis sidecar writes or Zotero library scan.
- [x] 7.5 Add regression coverage that old synchronization tables are removed or ignored after schema cutover.
- [x] 7.6 Run the minimal relevant core tests and `npm run build`; document any intentionally deleted legacy assertions.
