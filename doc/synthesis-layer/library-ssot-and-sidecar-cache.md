# Library SSOT and Sidecar Cache

This document defines the target Synthesis data boundary after the index model reset. It supersedes designs that tried to keep a continuously synchronized paper index inside the Zotero plugin.

## Decision

Zotero Library is the source of truth for Zotero-owned facts. Synthesis must not maintain an automatically synchronized copy of library items, item metadata, collection membership, tags, or deletion/merge state as an independent fact source.

Synthesis persistence is a sidecar cache and a store for user-approved derived decisions. It may be stale. It is valid only for the purpose and basis recorded on each projection.

## Why

Zotero plugins run in one process on one JavaScript event loop. A background event model inside that runtime is still foreground work from the UI's perspective. Long index rebuilds, startup reconcile, dirty queues, and graph maintenance caused UI stalls and conflicting status projections; this hard cut removes that model.

The core product workflows do not require a fully synchronized library index:

- `literature-analysis` reads Zotero item/attachment/note state directly and writes artifacts.
- Topic create/update reads Zotero Library and source artifacts directly; citation graph metrics are optional enrichment.
- Topic discovery hints are produced from digest/topic metadata and do not require a full library backscan.
- Topic freshness should compare a topic's recorded source manifest with current Zotero/artifact state, not with an index row that may be behind.

The index layer mainly serves citation graph and fast inspection. That makes it a cache, not a correctness dependency.

## Storage Boundary

| Data | SSOT | Synthesis Sidecar Role |
| --- | --- | --- |
| Zotero item metadata, existence, tags, collections, relations | Zotero Library | Read on demand through Host Library APIs. Do not persist an independent item metadata or library-membership copy in Synthesis sidecar tables. |
| Literature digest artifact, reference notes, embedded payload attachments | Zotero notes/attachments | Read on demand; cache only parseable embedded-payload existence, locator, fingerprint/hash, and diagnostics keyed by `source_ref`. Note existence and legacy hidden payload blocks are migration diagnostics only, not artifact availability. |
| Topic artifacts and source manifests | Topic artifact notes / workflow output | Store summaries, source-check diagnostics, and UI projection. |
| Raw reference entries extracted by digest/apply | Source references artifact payload | Store rows keyed by `source_ref`, `references_artifact_hash`, and reference index/hash for graph/query speed. Old rows become `stale` when their artifact hash is replaced. |
| Canonical reference dedupe and redirects | Synthesis sidecar facts plus user-approved decisions | Store canonical representatives and redirects between canonical references. Ambiguous merges require review. |
| Reference binding decisions | User-approved or deterministic Synthesis sidecar facts | Store canonical-reference-to-Zotero binding status, provenance, confidence, and evidence. |
| Citation graph nodes, edges, metrics, layout | Synthesis cache projection from active raw references, effective canonical references, and bindings | Rebuild explicitly from sidecar inputs; allowed to be stale. |
| Topic discovery hints | Synthesis sidecar suggestions | Best-effort suggestions; rejected hints are durable suppressions. |

## Non-Goals

- No automatic library-wide index synchronization.
- No startup reconcile that fans out Zotero library changes into sidecar work.
- No dirty-event queue whose purpose is to keep Synthesis in lockstep with Zotero.
- No full Registry rebuild on normal startup, snapshot read, or topic workflow read.
- No external process requirement just to keep a local index current.

## Allowed Update Paths

Synthesis sidecar state changes only through bounded, explicit paths:

| Path | Trigger | Effect |
| --- | --- | --- |
| Digest apply sync | `literature-analysis` apply succeeds | Filter deterministic invalid references before writing the references note, update artifact/reference sidecar rows for the applied `source_ref`, and mark Citation Graph plus related-items sync stale with source-scoped diagnostics. |
| Topic apply sync | topic create/update apply succeeds | Update topic metadata sidecars, concept/topic-graph proposals, and source manifest summaries. |
| Explicit reference sidecar refresh | user/debug command | Two-stage operation: scan artifact sidecar state, then process only changed references artifacts through extraction, canonical dedupe, and best-effort binding; mark Citation Graph plus related-items sync stale with changed source/canonical diagnostics. |
| Explicit reference binding review | user starts review/repair workflow | Generate candidates from canonical references and current Zotero metadata, let the user approve/reject/merge, then write durable binding decisions. |
| Graph cache incremental refresh | user refreshes a stale graph, or Advanced Matching changes graph-affecting sidecar facts | Recompute affected source-slice graph projection from active raw references, effective canonical references, binding decisions, and direct Zotero binding checks; public stale refresh may run scoped related-items sync after success. |
| Explicit graph cache rebuild | user opens graph refresh or debug command, or allowed bootstrap after heavy reference operations | Recompute full graph projection from active raw references, effective canonical references, binding decisions, and direct Zotero binding checks. |
| Explicit cache repair | user/debug command | Re-scan selected source items or artifacts; report a bounded diff before broad changes. |
| Reset/import/export | protected user command | Reset or move sidecar state according to documented scope. |

Normal Workbench reads must not create or drain maintenance work.

## Cache Readiness Semantics

Cache readiness is advisory:

- `ready`: sidecar cache basis is readable for its recorded source basis.
- `stale`: projection basis is known to be older than current source or was explicitly invalidated.
- `missing`: cache basis does not exist for the requested scope.
- `refreshing`: an explicit operation is currently rebuilding this cache.
- `failed`: the last cache-basis write for this scope failed and no newer ready basis is available.

Topic freshness is separate. A topic is fresh when its recorded source manifest still matches current Zotero/artifact reads. Graph cache readiness must not make a topic changed.

## Reference Binding Governance

Reference entries and binding are the only sidecar area that may contain durable Synthesis-owned facts with user value.

Rules:

- Raw reference entries come from references artifacts and can be regenerated for a changed `source_ref + references_artifact_hash`.
- Canonical reference redirects preserve dedupe decisions across raw-reference re-extraction.
- Automatic binding must be precision-first and explainable.
- Ambiguous dedupe, merge, and library binding decisions require explicit review.
- User-approved decisions survive cache rebuilds and carry provenance.
- Binding repair may suggest Zotero related-item updates, but Zotero Library remains the SSOT for the actual relation state.

## UI Contract

Workbench should present sidecar state as cache:

- Show when graph/reference projections were last refreshed and what basis they used.
- Label missing/stale/failed cache clearly without blocking core topic workflows.
- Offer explicit refresh/review actions instead of silently starting background jobs.
- Never render an internal queue as proof that Zotero Library is synchronized.
- If cache is missing, show a degraded view and a clear refresh action.

## Migration Direction

Existing dirty events, startup reconcile, registry epoch rebuilds, and WorkItem/WorkRun progress rows are removed implementation targets. Do not retain them for compatibility; callers must move to explicit sidecar refresh/review operations and direct Zotero Library reads for correctness.
