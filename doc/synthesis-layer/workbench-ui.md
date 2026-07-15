# Synthesis Workbench UI

Workbench UI is a read model over Zotero Library, workflow artifacts, and committed Synthesis sidecar state. It should explain cache status without pretending the cache is a fully synchronized library index.

## UI Read Path

- Home, Topics, Graph, Cleanup, Operations, and option lists read from repository-backed sidecar snapshot state where cache is sufficient.
- Index/library inspection views read current Zotero Library facts directly and join artifact/reference sidecar rows for cache status; they must not treat sidecar rows as the library item list.
- Correctness-sensitive topic source checks and item details should read current Zotero/artifact state through the host/source facade.
- Legacy JSON, canonical projections, and archived files must not appear as implicit fallback rows.
- Debug file inspection belongs in debug tools, not normal Workbench UI.
- Normal Workbench reads must not start library-wide reconciliation or cache refresh.
- Progress, chrome, client, and debug reads are pure queries: they must not cancel or update a `running` operation. Explicit startup reconciliation is the only lifecycle path that cancels persisted `running` rows as restart orphans.

## Surface-Scoped Refresh Architecture

Workbench UI uses three read-model layers:

- Shell: selected tab, navigation, and persistent surface containers.
- Chrome: statusbar, operation progress, job popover, and local pending action state.
- Surface: one named content area, one of `home`, `topics`, `index`, `review`, `graph`, `tags`, `concepts`, or `reader`.

Active Workbench hot paths must use surface-scoped messages:

- `ready` initializes shell/chrome and requests the active surface only.
- `selectTab` switches the shell state and requests only the selected surface when it is missing or dirty; switching back to an already loaded clean surface must serve the cached read model.
- operation progress is read through the narrow `SynthesisClient.workbench.readProgress()` projection and updates chrome only.
- local review pending, selection, and drawer state updates only the review/index surface and chrome.
- Review Center filter changes may reload only the Review surface, using the active review tab and filters as query bounds.
- explicit refresh or completed operations invalidate only declared surfaces; hidden invalidated surfaces are marked dirty and are not reloaded until viewed or explicitly refreshed.

The monolithic full Workbench snapshot is debug-only. It must not be used by `ready`, `selectTab`, `setFilters`, operation progress polling, local review actions, or graph layout checks. Startup warmup may prefill only lightweight chrome by default. Content surfaces must be loaded when visible, explicitly requested, or scheduled through a bounded surface list; they must yield before phase work starts and must not show a Zotero ProgressWindow or block the first Workbench paint.

Chrome is not a content surface. It may read operation rows, cache-basis rows, storage status, and local pending command state, but it must not read Citation Graph nodes/edges, Index rows, Review proposal evidence, Tag/Concept projections, or Topic Graph data.

Zotero Library item notifications are UI read-model invalidations, not sidecar synchronization events. Parent item add/modify/delete/trash/refresh notifications mark the Index surface dirty because the Zotero title/year/creator rows shown there are direct-read SSOT data. If Index is visible, Workbench may debounce and reload only the Index surface; if it is hidden, it must remain dirty until selected. This invalidation must not start `refreshReferenceSidecarNow`, must not rebuild graph/tag/concept caches, and must not change `synt_cache_basis`.

Index and Review are separate hot paths. Index may load a bounded current-library page and a small open-review drawer slice. In normal library scope, Index rows carry artifact coverage and reference counts only; they must not carry every raw reference for collapsed rows. Referenced-only mode may load a bounded raw-reference page and the matching source rows. Index must not load the Review Center proposal page. Review Center must use its active tab/status/kind/confidence state to load a bounded page of review data and the minimal readable context for those rows only. Review proposal context must use summary Zotero item reads and bounded raw-reference ids; it must not route through the Index sidecar row builder or read child note payloads.

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

Advanced Reference Matching appears under Index and Review as an explicit review workflow. The Index fact tables continue to show accepted binding facts and unbound derived state; open proposals are displayed in the review drawer and Review Center with Accept/Reject actions. The Review Center also lets users manage prior decisions: accepted proposals can be reopened, rejected, or deleted, and rejected proposals can be reopened, accepted, or deleted. Changing an accepted proposal must revoke the binding or redirect fact created from that proposal. Running advanced matching must require confirmation because it may run heavier binding and canonical dedupe logic than refresh.

Reference Sidecar refresh/retry and advanced matching run/retry route through no-argument `SynthesisClient.references` commands. These commands do not carry UI progress callbacks; the existing 500 ms `workbench.readProgress()` poll remains the progress source. Refresh and advanced matching keep their confirmations, while both retry actions remain confirmation-free.

Canonical revision Accept/Reject, single proposal actions, batch proposal decisions, single/batch canonical merge, metadata update, and archive route through strict `SynthesisClient.references` commands. The Workbench owns input aliases, trimming, default actions, batch filtering and canonical mapping, manual target mapping, boolean confirmation coercion, and metadata patch alias normalization. The client boundary validates canonical identifiers, action enums, merge pairs, bounded metadata fields, and manual-target discriminators. These commands retain command single-flight and singular `diagnostic` handling, add no confirmation dialog or progress callback, and keep domain failure objects and plural `diagnostics` as results. Merge commands refresh Index/Review/Graph, metadata/archive refresh Index/Review, and only batch canonical merge uses deferred start. Reference queries and non-Reference command domains remain on their current paths.

Concept KB rebuild, display-text update, review actions, and deletion route through strict `SynthesisClient.concepts` commands. The Workbench owns identifier trimming, review action selection, optional merge targets, and single/batch deletion aliases; the client boundary accepts only the four Concept display fields, strict review actions, and non-empty deletion batches. Rebuild keeps its protected confirmation and deferred start but carries no UI progress callback; persisted Workbench progress polling remains the progress source. Only review actions use singular `diagnostic` failure handling, and all four commands refresh Concepts/Review. Concept queries and checkpoint export remain on their current paths.

Topic artifact deletion and purge plus discovery-hint rejection and restoration route through strict `SynthesisClient.topics` commands. Delete and purge retain their destructive confirmations and immediate single-flight execution; deletion still surfaces a returned domain reason when the Topic is not found. Discovery-hint actions retain trimmed identifiers, empty-ID skipping, singular `diagnostic` handling, and selected-surface refresh, so plural domain diagnostics remain reviewable results. Delete and purge refresh Home/Topics. These commands add no progress callback, streaming state, deferred start, or identifier aliases; Topic queries and mirror operations remain on their current paths.

Topic Graph projection rebuild, edge acceptance/rejection, and review actions route through a distinct `SynthesisClient.topicGraph` capability rather than Citation Graph. Rebuild keeps protected confirmation, deferred start, persisted progress polling, and its current Home-only refresh while carrying no UI callback. Edge actions retain trimmed identifiers, empty-ID skipping, their shared decision single-flight key, and singular diagnostic handling. Review retains exact `approve_suggested` selection with reject as the Workbench default. The three mutations refresh Home/Topics/Graph/Review; Topic Graph queries and checkpoint export remain on their current paths.

Tag Vocabulary validation, projection rebuild, regulator export, and staged bulk promote/discard/clear route through `SynthesisClient.tags`. The maintenance/export commands retain their existing empty single-flight arguments, confirmation, start timing, progress polling, clipboard ownership, and Home/Tags refresh behavior. Promote/discard retain the array-or-singular input normalization, String/trim/empty filtering, first-tag single-flight key, and Workbench-side empty-selection skip; their strict client selection DTO also accepts an empty array for Workflow Host no-op compatibility. Clear keeps its no-argument global key. All three staged bulk commands start immediately, add no confirmation, deferred start, progress callback, streaming, or singular diagnostic transformation, and refresh only Tags. Staged edit, imports, vocabulary edits/deletion, and bootstrap remain on their current paths; audit remains a Workflow Host client operation.

Canonical merge proposals must show readable source and target reference titles when matcher evidence provides them. Internal canonical ids are fallback diagnostics, not the primary decision text.

## Sync Status and Conflict Review

The Workbench Sync panel is a runtime surface, not the long-term sync configuration editor. WebDAV base URL, WebDAV remote path, username, retry policy, and encrypted credential state are owned by Zotero Preferences. Git Sync is retained as hidden/deprecated service code and is not exposed by the Workbench Sync panel. When WebDAV Sync is disabled or incomplete, Workbench shows the config state and offers `Open preferences` as the primary action.

When WebDAV configuration is complete, Workbench may expose runtime actions such as `WebDAV Sync now`, `Pause`, `Resume`, and `Retry` based on service-provided `allowedActions`. The panel should use a compact summary row for remote path, base URL, and queue state, then place last run, recent sanitized connection-test diagnostics, and execution feedback in the terminal-style log area. It must never display or accept a password in the Workbench.

When WebDAV Sync enters `blocked_conflict`, the panel switches to conflict review. Each conflict row should show entity kind/id when available, asset path, reason, and short base/local/remote hash summaries. Conflict actions are service-defined semantic commands: `keep_local`, `use_remote`, `save_remote_copy`, `mark_needs_attention`, and `clear_after_manual_edit`. In v1, Workbench should enable only actions present in the service projection. Unsupported actions may be visible for discoverability, but must be disabled with diagnostics rather than locally inventing behavior.

`keep_local` closes the current report and queues export without writing remote facts into SQLite. `save_remote_copy` writes a review copy and leaves sync blocked. `clear_after_manual_edit` reruns validation and import preview before unblocking. `use_remote` and `mark_needs_attention` require backend guarantees for safe single-entity apply or durable review marking; otherwise they remain disabled.

## Graph UI

- Show all library nodes by default.
- Show shared external nodes with incoming degree greater than 1.
- Keep single-degree external nodes hover-only by default.
- If graph cache is stale and graph rows still exist, render the latest usable graph and show `refreshCitationGraphCacheIncrementalNow` when stale delta metadata is available; after a successful stale refresh, the host may run scoped related-items sync for the final affected source refs. Full rebuild remains the fallback when no delta is recorded.
- If graph cache is failed but graph rows still exist, render the latest usable graph and offer `rebuildCitationGraphCacheNow`.
- If graph cache is missing, show a clear cache state and run `rebuildCitationGraphCacheNow` from the primary manual rebuild action. Sidecar-changing actions mark graph stale instead of starting source-slice graph refresh.
- If graph structure exists but layout is missing/stale, draw what is available and offer `manualRecomputeLayout`.
- Route manual and automatic layout recomputation through `SynthesisClient.graph`; manual recomputation is forced, while automatic recomputation retains the layout-ready and graph-hash guards and is not forced.
- Route full rebuild, incremental refresh, and failed rebuild retry through no-argument `SynthesisClient.graph` commands. These commands do not carry UI progress callbacks; the existing 500 ms `workbench.readProgress()` poll remains the progress source.
- If graph cache is stale, failed, or missing, show a visible cache badge and keep topic workflows available.
- Graph search is explicit: typing in the control does not refresh the surface until `Search` is pressed; `Clear` resets search immediately.
- Graph edges should indicate direction with directed arrow rendering and target-tinted edge color. Hovering a visible neighbor of a selected node should show that neighbor title, including external reference nodes.

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
- accepted or rejected advanced reference match proposal;
- ignored cleanup proposal;
- user-confirmed merge/delete override.

Review queues should be bounded and batchable. Reference binding, merge, and dedupe review are explicit workflows. If candidate generation detects a very large duplicate or reference-resolution candidate set, the UI should show an aggregate diagnostic with filters and bulk actions instead of rendering thousands of individual cards.

The Home Library Insights section may show a Review items card, but the count must come from the snapshot's review summary or already-loaded domain arrays. It must not depend on opening the Review tab to initialize review data.

## Dangerous Actions

Dangerous actions require:

- visible warning copy;
- first confirmation dialog;
- exact typed confirmation phrase;
- backend confirmation validation;
- success/failure status update;
- snapshot refresh after success.

Dangerous cache actions should describe that Zotero Library is not deleted or overwritten unless the action explicitly says it will call Zotero APIs. Sidecar cache reset is different from Zotero Library mutation.
