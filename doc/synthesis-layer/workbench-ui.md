# Synthesis Workbench UI

Workbench UI is a read model over Zotero Library, workflow artifacts, and committed Synthesis sidecar state. It should explain cache status without pretending the cache is a fully synchronized library index.

## UI Read Path

- Home, Topics, Graph, Cleanup, Operations, and option lists read from repository-backed sidecar snapshot state where cache is sufficient.
- Index/library inspection views read current Zotero Library facts directly and join artifact/reference sidecar rows for cache status; they must not treat sidecar rows as the library item list.
- Correctness-sensitive topic source checks and item details should read current Zotero/artifact state through the host/source facade.
- Legacy JSON, canonical projections, and archived files must not appear as implicit fallback rows.
- Debug file inspection belongs in debug tools, not normal Workbench UI.
- Normal Workbench reads must not start library-wide reconciliation or cache refresh.

## Cache Status and Operations

Workbench should expose sidecar projections as cache:

- last refreshed time and scope when available;
- basis or policy version when useful;
- artifact scan counts, changed references count, and binding-review recommendations for reference sidecar refresh;
- `missing`, `refreshing`, `ready`, `stale`, or `failed` status;
- degraded states when graph/reference cache is absent;
- explicit refresh, repair, or review actions.

Do not show stale cache as a Zotero Library error. A stale graph cache should not block literature digest, topic create/update, or source check.

Workbench status must combine two sources without collapsing them:

- running/failed/completed command progress comes from `synt_operation`;
- Reference Sidecar and Citation Graph cache readiness comes from `synt_cache_basis`.

Workbench must not infer Reference Sidecar or Graph readiness from legacy sidecar state files, legacy sidecar index files, legacy graph index files, graph manifests, or other projection files.

Workbench must not read or render Synthesis dirty queues, WorkItems, WorkRuns, startup reconcile, or queue aggregates. These are removed implementation targets.

Explicit operations should show:

- submitted/queued/running/waiting/failed/completed state;
- source and label;
- determinate progress only when `current/total` or fixed phase count exists;
- indeterminate progress when work is real but total is unknown.

Reference sidecar refresh should expose stage-aware progress from real counts: scanned source items/artifacts, changed references artifacts, extracted raw references, canonical matches, and binding candidates. A broad refresh that has not discovered a total yet must stay indeterminate until a real total exists.

Do not invent percentages.

Queue aggregates and debug work listings are not part of the active UI contract. Debug views may inspect explicit operations and cache diagnostics only.

## Graph UI

- Show all library nodes by default.
- Show shared external nodes with incoming degree greater than 1.
- Keep single-degree external nodes hover-only by default.
- If graph cache is missing/stale, show a clear cache state and run `rebuildCitationGraphCacheNow` from the primary rebuild action.
- If graph structure exists but layout is missing/stale, draw what is available and offer `manualRecomputeLayout`.
- If graph cache is stale, failed, or missing, show a visible cache badge and keep topic workflows available.

Graph data rebuild and layout rebuild must remain different UI actions. Layout rebuild never repairs missing graph data.

## Review and Overrides

Review & Overrides should be user-facing and compact:

- show durable decisions in one management entry point;
- allow user to remove or change decisions;
- show why a decision exists in human terms;
- avoid exposing raw hashes unless in debug mode.

Examples of manageable decisions:

- rejected discovery hint;
- accepted reference-binding decision;
- ignored cleanup proposal;
- user-confirmed merge/delete override.

Review queues should be bounded and batchable. Reference binding, merge, and dedupe review are explicit workflows. If candidate generation detects a very large duplicate or reference-resolution candidate set, the UI should show an aggregate diagnostic with filters and bulk actions instead of rendering thousands of individual cards.

## Dangerous Actions

Dangerous actions require:

- visible warning copy;
- first confirmation dialog;
- exact typed confirmation phrase;
- backend confirmation validation;
- success/failure status update;
- snapshot refresh after success.

Dangerous cache actions should describe that Zotero Library is not deleted or overwritten unless the action explicitly says it will call Zotero APIs. Sidecar cache reset is different from Zotero Library mutation.
