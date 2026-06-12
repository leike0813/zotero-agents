# Runtime and Cache Refresh

Synthesis runs inside a single Zotero plugin process on a single JavaScript event loop. The target runtime model is therefore explicit, bounded cache maintenance rather than automatic library-wide synchronization.

The full data-boundary decision is in [Library SSOT and Sidecar Cache](./library-ssot-and-sidecar-cache.md).

## Runtime Principles

- Zotero Library is read directly when correctness matters.
- Source artifacts are read directly when topic or digest workflows need them.
- Synthesis sidecar state is a cache projection unless it records a user-approved reference/binding/dedupe decision.
- Workbench snapshot reads must not create or drain background work.
- Workbench UI reads are surface-scoped: chrome/status, Index, Review, Graph, Tags, Concepts, and Topics are separate read models.
- Normal startup must not reconcile the whole Zotero Library into Synthesis.
- Long work must be user/debug-triggered, scoped, cancellable when practical, and visibly stale-tolerant.
- Dirty events, WorkItems, WorkRuns, startup reconcile, queue drain, Registry rebuild, and registry epochs are removed implementation targets.

## Normal Runtime Flow

Normal workflow apply is the only automatic sidecar update path:

1. `literature-analysis` reads Zotero item/attachment/note data directly.
2. The workflow writes digest/reference artifacts to Zotero notes or embedded payload attachments.
3. Host apply updates bounded sidecar projections for that `source_ref`: artifact existence/hash state, changed references extraction, canonical-reference dedupe, and optional literature matching metadata.
4. Topic create/update reads Zotero Library and source artifacts directly. Citation graph metrics may be included only as optional enrichment.
5. Topic apply updates topic artifact sidecars, source manifest summaries, discovery profile metadata, and Concept/Topic Graph proposals.

No step above requires a full Registry rebuild, startup reconcile, or global dirty queue drain.

## Explicit Cache Operations

Broad maintenance is explicit:

| Operation | Trigger | Writes | Does Not Do |
| --- | --- | --- | --- |
| Artifact cache sync | digest/topic apply for one item/topic | selected artifact existence/hash projection rows | scan unrelated Zotero items or persist Zotero item metadata |
| Reference sidecar refresh | user/debug selects item/library scope | artifact sidecar scan/diff, changed raw-reference extraction, canonical-reference dedupe, safe best-effort binding, `reference-sidecar:library=ready`, and stale Citation Graph / related-items sync diagnostics with changed source scope | full library metadata projection, hidden graph refresh/rebuild, graph layout rebuild, related-items sync, or user approval decisions |
| Reference binding repair/review | user starts review flow | accepted/rejected binding, merge, dedupe, or retarget decisions | silently rewrite Zotero item metadata or run from ordinary refresh |
| Citation graph cache incremental refresh | user refreshes a stale graph, or Advanced Matching / proposal review changes graph-affecting sidecar facts | affected source-slice graph nodes, edges, incoming groups, source ownership, light metrics, and complex metrics; `citation-graph:library=ready` on success | scan artifacts, extract references, run matcher, rebuild layout, or topic work |
| Citation graph cache rebuild | user opens Graph rebuild/debug command, or allowed bootstrap after Advanced Matching when graph cache is missing | graph nodes, edges, and light metrics from active raw references, effective canonical references, and bindings; `citation-graph:library=ready` | scan artifacts, extract references, run binding review, rebuild layout, mark topics changed |
| Citation graph layout rebuild | user opens layout/debug command | layout coordinates for an existing graph hash and preset | rebuild graph data or refresh reference sidecar |
| Topic source check | user/debug/maintenance request for selected topic | source-check diagnostic from direct Zotero/artifact reads | read reference or graph cache as truth |
| Topic discovery repair | user/debug bounded repair | bounded hint rows | global LLM n x m judging |
| Related-items sync | successful manual stale graph refresh, Advanced Matching fact changes, proposal review fact changes, or explicit/debug command | Zotero native relation effect rows and diagnostics from accepted library-to-library citation edges | rebuild graph cache, extract references, run matcher, mutate sidecar facts, or delete unproven user-created Zotero relations |
| Reset/import/export | protected command | sidecar state according to declared scope | silently import legacy JSON into runtime |

Explicit operations should report progress using real counts or fixed phases. If the total is unknown, UI must show indeterminate progress rather than inventing a percent.

`synt_operation` is operation progress/history. It is the only source for running, failed, and completed command progress, but it is not a data-readiness source. `synt_cache_basis` is the only runtime source for Reference Sidecar and Citation Graph cache readiness. A completed operation does not imply ready data unless the corresponding cache basis was promoted; a failed operation must not overwrite an existing ready basis.

## Removed Synchronization Mechanisms

The hard-cut implementation must remove:

- `synt_dirty_event`;
- `synt_job_state`;
- `synt_work_item`;
- `synt_work_run`;
- `synt_work_queue_meta`;
- `synt_registry_rebuild_run`;
- `recordSynthesisUpdateEvent`;
- startup reconcile;
- worker drain, queue pause/resume/retry, and worker claiming;
- Registry full rebuild and `registry_epoch` as runtime truth.

Do not keep no-op compatibility shims for these APIs. Callers must move to direct sidecar writes or explicit operations.

## External Source Drift

The target model avoids automatic drift fan-out. Zotero Library drift is handled by direct reads and explicit inspection:

| Situation | Target Behavior |
| --- | --- |
| User opens a topic | Source check compares the topic source manifest with current Zotero/artifact reads for that topic. |
| User opens Graph | Graph view may show missing/stale/failed cache and offer citation graph cache rebuild. |
| Digest is applied | Only that item's artifact/reference sidecar projection is updated; Citation Graph and related-items sync are marked stale with source-scoped diagnostics. |
| Large Zotero changes happened outside Synthesis | UI/debug may recommend explicit reference sidecar refresh or binding repair. |
| Structural inconsistency is suspected | Fail closed for cache writes and ask for inspect/repair; do not generate per-item fan-out. |

Startup may do repository health checks and phased Workbench read-model warmup, but it must not reconcile sidecar cache, enqueue work, replay old operations, or start refresh. Warmup is not a maintenance operation: it may read bounded surface state, fill in-memory UI cache, and yield between phases, but it must not write domain cache rows.

## Cache Refresh Safety

Cache refresh/rebuild replaces regenerable projections. It does not own Zotero Library facts.

Required safety properties:

1. Read only the selected scope required by the operation. Reference sidecar refresh scans artifact presence/hash and reads changed references artifacts; binding repair may read Zotero metadata for the selected candidate scope.
2. Record cache basis: scope, artifact hashes or fingerprints, extractor/matcher policy version, binding decision version where relevant, and refresh time where available.
3. Write intermediate output to staging or otherwise keep it invisible until the operation completes.
4. Promote refreshed projection only after validation passes.
5. Preserve accepted binding/dedupe decisions or mark them `stale_target`; never silently drop them.
6. If refresh fails, keep the previous cache projection readable with diagnostics.

`registry_epoch` and `graph_basis_registry_epoch` are removed as runtime truth markers. Reference and graph cache basis should use artifact hashes/fingerprints, raw-reference extractor version, binding decision versions, policy version, scope, and refresh time.

Legacy sidecar state files, sidecar index files, graph index files, and graph manifests must not be read to infer Workbench job status or cache readiness.

## Two-Stage Reference Sidecar Refresh

Reference sidecar refresh is the broadest ordinary maintenance operation and must stay cheaper than the old Registry rebuild.

Stage 1 scans artifact sidecar state:

1. Enumerate the selected Zotero source scope.
2. Locate digest, references, and citation-analysis artifacts.
3. Update artifact sidecar existence, locator, fingerprint/hash, and diagnostics.
4. Compare `references_hash` against the previous sidecar row and build a changed set.

Stage 2 processes only changed references artifacts:

1. Mark old active raw references for disappeared or replaced `source_ref + references_hash` values as `stale`.
2. Read and parse only changed references artifacts.
3. Insert new raw references.
4. Assign canonical references and apply incremental redirects/dedupe.
5. Run safe best-effort binding only for new or affected canonical references when it fits the operation budget.
6. Leave ambiguous binding and broad metadata scans to explicit binding repair/review.

The operation should expose progress from real counts: scanned sources, changed artifacts, extracted raw references, canonical matches, and affected binding candidates. If a single source fails to parse, the operation should record a source-scoped diagnostic and continue where safe.

After successful stage 2, the reference sidecar cache basis is ready. The operation marks Citation Graph and related-items sync stale with changed source refs and binding canonical ids. It does not start graph refresh, graph bootstrap, or related-items sync. Users can later run the visible stale graph refresh; when that succeeds, it may run scoped related-items sync from the final affected source refs.

## Reference Binding Review

Reference binding is the most important sidecar-owned area. It should be explicit and reviewable because false positives can create wrong graph edges.

The flow is:

1. Generate candidates using indexed blocking keys such as normalized identifiers, compact title keys, and bounded author/year buckets.
2. Auto-accept only precision-first deterministic matches.
3. Run external canonical dedupe only inside the explicit advanced matching operation, never during refresh/apply.
4. Present ambiguous dedupe, merge, fuzzy, and binding candidates for user review.
5. Store accepted/rejected decisions with provenance, confidence, evidence summary, and affected Zotero binding or canonical redirect refs.
6. Trigger a separate graph incremental refresh for accepted binding/redirect fact changes where supported; do not rebuild layout inside review. A separate related-items sync may run after Advanced Matching fact changes, and it must not depend on graph cache success.

Fuzzy external dedupe is review-only in this version. It runs after deterministic dedupe clusters are formed and compares unresolved singleton canonical references against deterministic cluster representatives and remaining singleton targets under block and pair budgets.

Rejected or accepted decisions are durable sidecar facts, not ordinary cache rows.

## Related Items Sync

Zotero native related-item relations remain Zotero-owned facts. Synthesis may apply accepted library-to-library citation edges only through a visible related-items sync operation with durable provenance:

- create a pending external-write effect before calling Zotero APIs;
- never remove a relation without recorded Synthesis-created provenance;
- treat pre-existing relations as `already_existed`;
- if Zotero state diverges from recorded provenance, mark `stale_target` and leave Zotero untouched;
- failures update sync diagnostics and do not roll back graph/reference cache.

Related-items sync first uses ready graph cache rows when available. If graph cache is missing, stale, failed, empty, or a preceding graph refresh failed, it resolves the same edge set directly from active raw references, effective canonical redirects, and accepted reference bindings. It must not rebuild graph cache or run matcher logic.

## Failure Recovery

Use local recovery:

- A failed short transaction rolls back.
- A failed cache refresh keeps the previous projection.
- A failed side effect writes diagnostics and can be retried explicitly.
- A bad approved reference/binding decision is corrected through review/repair, not through hidden rebuild behavior.
- Database corruption recovery is covered in [Persistence and Files](./persistence-and-files.md).

## Dangerous Operations

Dangerous operations need UI confirmation and, when destructive, exact confirmation text:

- full sidecar reset;
- clean-install reset;
- import that overwrites sidecar state;
- explicit broad graph/reference cache refresh;
- rollback or deletion of user-approved binding/dedupe decisions;
- related-items sync revoke operation.

Dry-run should be available for broad repair/import operations where practical.
