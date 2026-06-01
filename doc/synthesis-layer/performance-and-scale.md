# Performance and Scale

This document defines target budgets for Synthesis runtime design. Budgets are engineering guardrails, not a promise that every current implementation already meets them.

The target model treats Synthesis persistence as a sidecar cache. Performance work should protect Zotero UI responsiveness and direct-read correctness rather than trying to keep a full index continuously synchronized.

## Scale Tiers

| Tier | Zotero-bound literature | Reference instances | External literature | Topics | Behavior |
| --- | ---: | ---: | ---: | ---: | --- |
| normal | <= 2,000 | <= 100,000 | <= 60,000 | <= 40 | Full Workbench experience should remain responsive. |
| target | <= 10,000 | <= 500,000 | <= 300,000 | <= 100 | Default architecture must still work with pagination and batching. |
| stress | <= 25,000 | <= 1,250,000 | <= 750,000 | <= 250 | Degraded mode and diagnostics are acceptable. |
| out of policy | above stress | above stress | above stress | above stress | Use degraded mode, bounded debug output, and explicit repair/rebuild commands. |

## UI Read Budgets

Contract key: `p95_ms`.

| Read Path | p95 Target | Required Strategy |
| --- | ---: | --- |
| Workbench snapshot | 500 ms | Delay heavy diagnostics; paginate large lists. |
| Reference/cache table page | 250 ms | Max page size 100; stale cache badge when basis is unknown or old. |
| Cleanup/review rows | 250 ms | Default limit 100. |
| Topic list/options | 250 ms | Read topic summaries and direct source-check summaries; do not trigger cache refresh. |
| Graph default read model | tiered | Read existing graph cache and expose missing/stale/failed status. Normal tier target p95 <= 1000 ms; target tier p95 <= 2500 ms with progressive render allowed; stress tier may return degraded summary/slice first. Missing/stale graph data recommends graph cache rebuild, not layout rebuild. |
| Operation popover | 150 ms | Active explicit operation limit 50. |
| Debug list | 1000 ms | Default limit 100, max 1000, `truncated` flag required. |

## SQLite Policy

Write transactions should be short:

- target: <= 100 ms;
- diagnostic warning: > 250 ms;
- forbidden inside write transaction: Zotero IO, file IO, network IO, LLM/skill calls, long layout compute, long metrics compute.

Required lookup groups:

| Group | Required Lookup Shape |
| --- | --- |
| Artifact sidecar | unique `source_ref`, by `(library_id, item_key)`, by `references_hash`, and by scan status. |
| Raw reference | `(source_ref, references_artifact_hash)`, `raw_hash`, `canonical_reference_id`, status, parsed title key, and strong identifiers. |
| Canonical reference | `identity_key`, normalized identifier/title keys, status, and redirect target/effective id lookup. |
| Reference binding | `canonical_reference_id`, unique active `(library_id, item_key)` where policy requires it, status, method, confidence. |
| Citation edge | source `source_ref`, effective canonical reference, bound Zotero target, status, graph input hash. |
| Citation layout | preset + graph hash. |
| Topic discovery hint | `(topic_id, source_ref)`, status. |
| Review item | domain/status/severity and `(scope_kind, scope_ref)`. |
| Cache basis state | `synt_cache_basis` status/scope/source hash or basis, `updated_at`, operation id; this is data readiness. |
| Operation progress state | `synt_operation` explicit command status, phase, counts, diagnostics; this is not data readiness. |
| Removed sync state | dirty/job/work queue rows must not be read by active UI or debug paths. |

## Explicit Operation Budgets

| Operation | Batch / Scope | Time Budget | Progress Total |
| --- | --- | ---: | --- |
| Digest apply sidecar sync | one Zotero item / artifact bundle | 1000 ms soft | Artifact hashes, changed references, raw references, canonical matches. |
| Reference sidecar refresh stage 1 | selected source scope | 2000 ms per slice | Scanned source items/artifacts. |
| Reference sidecar refresh stage 2 | changed references artifacts | 3000 ms per slice | Changed artifacts, extracted raw references, canonical matches, binding candidates. |
| Reference binding review candidate generation | selected canonical references or source refs | 3000 ms per slice | Candidate blocks or references. |
| Citation graph cache rebuild | selected cache scope | 3000 ms per slice | Active references, effective canonical references, bindings, nodes, edges, and light metrics. |
| Citation graph complex metrics | phase bounded | 3000 ms | Fixed phases or metric rows. |
| Citation graph layout rebuild | cached read fast path; compute in bounded slices | 3000 ms per explicit operation tick | Layout nodes or fixed phases for an existing graph hash. Target/stress tiers may use stale or partial coordinates while rebuild continues. |
| Zotero related-items sync | explicit 100 accepted library edges | 2000 ms | Accepted library-to-library citation edges. |
| Topic discovery apply-time match | active topics for one literature | 2000 ms | Active topic count. |
| Topic discovery repair | 500 topic-literature pairs | 2000 ms | Bounded pairs. |
| Topic source check | one topic | 2000 ms | Saved source count. |
| Import preview/apply | 1000 rows/files | 3000 ms | Input rows or files. |

Default explicit operation slice budget is 2000 ms. Long operations should stop at budget boundaries, commit bounded progress, and let the user continue, retry, or cancel rather than blocking the Zotero UI.

## External Source Drift Policy

The target model does not run automatic startup reconcile. Drift is discovered by direct reads, explicit inspect, or explicit repair. No legacy drift detector should remain enabled.

| Severity | Threshold | Action |
| --- | --- | --- |
| `small` | selected-scope direct read finds changed artifacts/items | Show cache stale/missing and offer scoped repair. |
| `bulk` | broad library drift suspected or selected inspect exceeds budget | Record bounded diagnostic and recommend explicit cache refresh; fan-out forbidden. |
| `structural` | binding collision, impossible parent note structure, decode failure ratio >= 2%, hard fingerprint timeout, inconsistent Zotero API/DB result | Fail closed for cache writes and require inspect/repair/reset; fan-out forbidden. |

## Pagination and Diagnostics

- Default list page size: 50.
- Max normal page size: 100.
- Debug default limit: 100.
- Debug max limit: 1000.
- All truncated responses must include `truncated: true` and limit metadata.
- Diagnostics should include contract IDs, scale tier summary, slow phase/query label, and limit metadata.
- Diagnostics must not include tokens, full note HTML, unbounded raw rows, or local paths unless a debug option explicitly requests them.
