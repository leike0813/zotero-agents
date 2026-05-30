# Performance and Scale

This document defines target budgets for Synthesis runtime design. Budgets are engineering guardrails, not a promise that every current implementation already meets them.

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
| Registry table page | 250 ms | Max page size 100. |
| Cleanup/review rows | 250 ms | Default limit 100. |
| Topic list/options | 250 ms | Read DB summaries, not files. |
| Graph default read model | tiered | Semantic slice: all library nodes, shared external nodes, hover-only external leaves. Normal tier target p95 <= 1000 ms; target tier p95 <= 2500 ms with progressive render allowed; stress tier may return degraded summary/slice first. |
| Job popover | 150 ms | Active job limit 50. |
| Debug list | 1000 ms | Default limit 100, max 1000, `truncated` flag required. |

## SQLite Policy

Write transactions should be short:

- target: <= 100 ms;
- diagnostic warning: > 250 ms;
- forbidden inside write transaction: Zotero IO, file IO, network IO, LLM/skill calls, long layout compute, long metrics compute.

Required index groups:

| Group | Required Lookup Shape |
| --- | --- |
| Zotero binding | unique `(library_id, item_key)`, by `literature_item_id`. |
| Literature identifier | `(kind, normalized_value)`, by `literature_item_id`. |
| Artifact state | `(literature_item_id, artifact_type)`. |
| Reference instance | source literature item, raw reference hash, parsed title key. |
| Reference resolution | reference instance, target literature item, status. |
| Citation edge | source, target, status, graph epoch/input hash. |
| Citation layout | preset + graph hash. |
| Topic discovery hint | `(topic_id, literature_item_id)`, status. |
| Review item | domain/status/severity and `(scope_kind, scope_ref)`. |
| Dirty event | status/event/scope, optional basis epoch/source hash, `next_retry_at`. |
| Job state | status/source/updated_at, `run_id`. |

## Worker Budgets

| Worker | Batch / Scope | Time Budget | Progress Total |
| --- | --- | ---: | --- |
| Registry/graph cache rebuild | 1000 rows | 3000 ms | Zotero items, artifact notes, references, or fixed phases. |
| Paper registry incremental | 25 paper events | 2000 ms | Started paper events. |
| Startup reconcile fingerprint scan | 500 Zotero items | 2000 ms | Scanned Zotero items. |
| Citation graph structure | 1000 reference instances | 2000 ms | Started reference instances or source papers. |
| Citation graph complex metrics | phase bounded | 3000 ms | Fixed phases or metric rows. |
| Citation graph layout | cached read fast path; compute in batches | 3000 ms per worker tick | Layout nodes or fixed phases. Target/stress tiers may use stale or partial coordinates while async layout continues. |
| Zotero related-items sync | 100 matched library edges | 2000 ms | Matched library edges. |
| Topic discovery apply-time match | active topics for one literature | 2000 ms | Active topic count. |
| Topic discovery repair | 500 topic-literature pairs | 2000 ms | Bounded pairs. |
| Topic source check | one topic | 2000 ms | Saved source count. |
| Import preview/apply | 1000 rows/files | 3000 ms | Input rows or files. |

Default worker tick budget is 2000 ms. Workers should stop at budget boundaries, commit bounded progress, and leave retryable work instead of blocking the Zotero UI.

## External Source Drift Thresholds

Startup reconcile classifies drift before enqueueing work:

Contract keys: `changed_items_max`, `changed_ratio_max`, `decode_failure_ratio_lt`, `changed_items_gt`, `changed_ratio_gt`.

| Severity | Threshold | Action |
| --- | --- | --- |
| `small` | changed items <= 50 and <= 5% active library; decode failure ratio < 2%; scan within budget | Emit bounded Registry dirty events. |
| `bulk` | changed items > 50 or > 5%; suspicious bulk merge/delete/update; scan over soft budget without structural anomaly | Record drift incident and recommend explicit Registry/Graph rebuild; fan-out forbidden. |
| `structural` | binding collision, impossible parent note structure, decode failure ratio >= 2%, hard fingerprint timeout, inconsistent Zotero API/DB result | Fail closed and require inspect/repair/reset/rebuild; fan-out forbidden. |

## Pagination and Diagnostics

- Default list page size: 50.
- Max normal page size: 100.
- Debug default limit: 100.
- Debug max limit: 1000.
- All truncated responses must include `truncated: true` and limit metadata.
- Diagnostics should include contract IDs, scale tier summary, slow phase/query label, and limit metadata.
- Diagnostics must not include tokens, full note HTML, unbounded raw rows, or local paths unless a debug option explicitly requests them.
