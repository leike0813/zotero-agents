## Context

Synthesis currently contains several generations of index maintenance logic: dirty events, WorkItems, WorkRuns, startup reconcile, Registry rebuild promotion, worker drains, and Workbench background job projection. These mechanisms were designed to keep a Synthesis-side copy of Zotero Library facts synchronized with Zotero. In practice they run inside the same Zotero plugin event loop, so "background" work still competes with UI responsiveness and can leave progress, queue, and cache status disagreeing.

The target model is a hard cut. Zotero Library owns Zotero facts. Workflow artifacts own generated digest/topic content. Synthesis persistence is a sidecar cache plus explicit user-approved reference, binding, merge, dedupe, and related-items decisions. Cache refresh is allowed to be stale, scoped, and explicit.

## Goals / Non-Goals

**Goals:**

- Remove automatic library-wide synchronization, startup reconcile fan-out, dirty-event queues, WorkItem/WorkRun workers, and queue-drain debug controls from active Synthesis behavior.
- Replace the old Registry/Index fact-source role with sidecar tables for artifact projections, reference entries, binding decisions, citation graph cache, and explicit operation records.
- Make literature digest and reference matching apply paths write sidecar state directly for the affected item or decision.
- Make Workbench, Host Bridge, and MCP surfaces communicate cache state and explicit operations, not background sync state.
- Allow destructive schema changes and test rewrites so old code paths are deleted rather than kept as compatibility shims.

**Non-Goals:**

- Do not migrate old queue/job/rebuild runtime rows.
- Do not create a Web Worker or external process to keep Zotero synchronized.
- Do not keep legacy Host Bridge queue control or WorkItem debug APIs.
- Do not make citation graph cache a precondition for literature digest, topic create/update, or topic source checks.

## Decisions

1. **Zotero Library and artifact notes remain SSOT.**

   Synthesis will read Zotero Library directly when correctness matters. Sidecar rows may cache metadata snapshots only with explicit basis fields and must not be treated as authoritative existence, metadata, tag, collection, note, attachment, or native relation state. This avoids a second fact source whose update policy can drift from Zotero.

2. **Explicit operation records replace WorkItems and WorkRuns.**

   The repository will store `synt_operation` rows for user/debug-triggered work such as `reference_cache_refresh`, `citation_graph_cache_refresh`, `reference_binding_review`, `related_items_sync`, `import`, `export`, and `reset`. Operations are observable progress records, not a claimable queue. They do not have owner workers, retry scheduling, coalescing, startup recovery, or drain semantics.

3. **Destructive schema cutover is allowed.**

   Synthesis sidecar schema may drop old tables such as `synt_dirty_event`, `synt_job_state`, `synt_work_item`, `synt_work_run`, `synt_work_queue_meta`, and `synt_registry_rebuild_run`. Persisted sidecar cache can be regenerated from Zotero/artifacts or recreated through explicit review. This is less risky than continuing to maintain migration bridges for a model that is being removed.

4. **Apply paths write bounded sidecar state directly.**

   Literature digest apply updates artifact projection, reference entries, and matching metadata for the affected item. Reference matching apply writes explicit binding/review decisions. Neither path records dirty events. If graph cache should be refreshed afterward, the UI reports a stale cache and offers explicit refresh.

5. **Citation graph is a cache projection.**

   Citation graph nodes, edges, metrics, and layout are computed from current sidecar reference entries, binding decisions, and direct Zotero binding checks. Refresh is explicit, scoped, progress-reporting, and stale-tolerant. Failed refresh keeps the previous active cache.

6. **Workbench and Host Bridge remove queue semantics.**

   Workbench maintenance presents sidecar cache status, bounded explicit operations, and review surfaces. Host Bridge debug can inspect cache and operations but must not expose queue pause/resume/retry/drain/clear controls. CLI and MCP commands that read paper registry or graph data must describe those results as cache views.

## Risks / Trade-offs

- **Old tests and consumers depend on queue APIs** -> Remove or rewrite those tests and update Host Bridge/MCP manifests in the same implementation. Do not leave no-op compatibility exports.
- **Users may lose existing cache rows after schema reset** -> Treat sidecar cache as regenerable. Keep only user-approved decisions that are part of the new schema; old rows can be discarded because this change explicitly permits breaking persistence.
- **Graph cache may be stale more often** -> UI must label stale/missing graph state and offer explicit refresh. Topic and digest workflows must continue without graph cache.
- **Reference binding review is more explicit and may require later UI work** -> Implement minimal bounded review state first; advanced batch review can follow once old automation is removed.
- **Hard cut is large** -> Sequence implementation so specs/docs hard-cut first, then repository schema/API, then service/UI/Host Bridge, then tests. Each step should remove old call sites instead of wrapping them.

## Migration Plan

1. Update active docs and OpenSpec contracts to remove legacy/transition wording.
2. Introduce the new sidecar schema and explicit operation model.
3. Delete old update event, WorkItem, WorkRun, startup reconcile, worker-drain, and Registry rebuild APIs.
4. Rewrite digest/reference matching apply hooks to direct sidecar writes.
5. Rewrite Workbench and Host Bridge/MCP read models around cache status and explicit operations.
6. Delete or rewrite tests that assert dirty events, WorkItems, startup reconcile, and queue projection.

Rollback is not a compatibility target. During development, rollback is git-level only.

## Open Questions

- Which user-approved legacy decisions, if any, are valuable enough to map into the new schema during the first implementation pass?
- Should `get_library_index` be removed immediately or kept only as a renamed cache-view alias until CLI docs are updated?
- What is the smallest useful reference binding review UI for the first hard-cut implementation?
