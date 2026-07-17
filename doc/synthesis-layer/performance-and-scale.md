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
| Workbench chrome input | 150 ms | Read operation/cache/status state only; no content surface reads and no graph overview construction. |
| Workbench active surface input | 500 ms | Load one named surface; no unrelated graph/tag/concept/index fan-out. |
| Reference/cache table page | 250 ms | Max page size 100; stale cache badge when basis is unknown or old. |
| Cleanup/review rows | 250 ms | Review Center default limit 50; Index drawer may load only a small open-review slice. |
| Topic list/options | 250 ms | Read topic summaries and direct source-check summaries; do not trigger cache refresh. |
| Graph default read model | tiered | Read existing graph cache and expose missing/stale/failed status. Normal tier target p95 <= 1000 ms; target tier p95 <= 2500 ms with progressive render allowed; stress tier may return degraded summary/slice first. Missing/stale graph data recommends graph cache rebuild, not layout rebuild. |
| Operation popover | 150 ms | Active explicit operation limit 50. |
| Debug list | 1000 ms | Default limit 100, max 1000, `truncated` flag required. |

Workbench full snapshot construction is a debug path, not a UI budget target.
Startup warmup should fill lightweight chrome only by default. Content surface
warmup must be bounded, explicit, and yield to Zotero's event loop before each
phase. Hidden surfaces may remain stale until viewed or explicitly invalidated.

Workbench tab switching should reuse loaded clean surface read models. A hidden
surface invalidated by an operation should be marked dirty, not refreshed in the
background. Zotero Library item notifications should only mark affected direct-read
surfaces dirty and debounce a reload when the affected surface is visible; the
notifier path must not scan the library, construct a full Workbench snapshot, or
start Reference Sidecar refresh. Index surface reads must bound both the Zotero Library page and the
sidecar join to the current page's source refs. Default Index rows should carry
reference counts, not full raw-reference arrays; full reference rows are loaded
only for bounded referenced views or explicit row/detail reads. Review surface
reads must be bounded by the active Review tab and status/kind/confidence filters
and must load readable context from summary item reads plus bounded raw-reference
ids only.

## SQLite Policy

The service's WS5 shadow database is limited to three foundation tables and
short synchronous main-process transactions. Its only application read is the
`workbench.chrome.read` canary: two fixed indexed cache lookups plus at most 50
running and 20 current failed operations, under the 150 ms chrome target. It
performs no engine compute, Host/file/network IO, production reads, review
queries, or content-surface reads. Startup schema validation and running-operation
reconciliation complete before readiness; health/handshake use a maintained
snapshot and never query row counts. Adding table families or domain workload
requires a later parity design rather than expanding this canary implicitly.

The WS5 Topic canonical shadow is also main-process owned, but it is not a hot
path or production apply route. Inspect reads one requested Topic and returns
only three file hashes plus sorted section descriptors under the general 1 MiB
and 50,000-node wire limits; it never enters the compute worker queue. Canonical
promotion is globally single-concurrency with immediate backpressure, performs
all validation and expected-basis checks before the first write, and fsyncs a
complete staging tree before journaled rename. Adding Topic list/detail/apply,
assets, archives, or automatic cleanup requires a later application change.

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

Advanced external dedupe must stay outside refresh/apply hot paths. The
production cluster-first pass uses bounded blocking keys and an operation-level
pair budget; it must not compare every canonical reference against every other
canonical reference. When a block or operation exceeds budget, the operation
records diagnostics and skips excess comparisons rather than broadening scope.

The realtime Synthesis Index harness uses the same cluster algorithm and budget
principle as production Advanced Reference Matching. It may read current
Zotero/plugin SQLite state, but its algorithm output is written only to an
isolated debug SQLite database and it must not update production sidecar,
proposal, binding, redirect, or graph cache tables. Representative selection is
quality/stability first:
raw support is capped evidence, not an unbounded score multiplier, so large
noisy extraction clusters do not dominate clean canonical representatives.
The harness performs an eligibility/filter pass before blocking: excluded
records such as bare DOI/URL rows, pure publication metadata, or titles with too
few content tokens do not create candidate blocks or pair comparisons. The
contained-title classifier must use structured suffix evidence; expanding a long
list of concrete venue tokens is not an acceptable performance or precision
strategy.
| Cache basis state | `synt_cache_basis` status/scope/source hash or basis, `updated_at`, operation id; this is data readiness. |
| Operation progress state | `synt_operation` explicit command status, phase, counts, diagnostics; this is not data readiness. |
| Removed sync state | dirty/job/work queue rows must not be read by active UI or debug paths. |

## Explicit Operation Budgets

| Operation | Batch / Scope | Time Budget | Progress Total |
| --- | --- | ---: | --- |
| Digest apply sidecar sync | one Zotero item / artifact bundle | 1000 ms soft | Artifact hashes, changed references, raw references, canonical matches. |
| Reference sidecar refresh stage 1 | selected source scope | 2000 ms per slice | Scanned source items/artifacts. |
| Reference sidecar refresh stage 2 | changed references artifacts | 3000 ms per slice | Changed artifacts, extracted raw references, canonical matches, binding candidates. |
| Advanced reference matching | <= 25,000 indexed papers and <= 750,000 binding/dedupe records; three candidates per binding; cluster blocks <= 30 and pair budget <= 3,000 | 3000 ms per slice | Indexed papers, processed references, auto-accepted matches, proposals created, rejected proposals preserved. Both engine passes compute outside the write lock and promote atomically after Host/repository basis recapture. |
| Reference binding review candidate generation | selected canonical references or source refs | 3000 ms per slice | Candidate blocks or references. |
| Citation graph cache incremental refresh | affected source refs | 1500 ms per slice | Source refs, rebuilt outgoing edges, affected nodes, and light metrics. |
| Citation graph cache rebuild | full or source slice; build contract capped at 25,000 sources / 1,250,000 references / 750,000 external targets | 3000 ms per slice | Active references, effective canonical references, bindings, nodes, edges, ownership, incoming groups, and light metrics. Durable facts are captured under a short lock; Host reads and build-engine compute run outside it; promotion recaptures the basis. |
| Citation graph complex metrics | one canonical snapshot capped at 5,000 nodes / 20,000 edges | 5000 ms shared sidecar hard deadline | Fixed phases or metric rows. Authenticated sidecar PageRank/component/role computation runs outside the write lock; promotion rechecks the graph hash under a short lock. |
| Citation graph layout rebuild | one canonical snapshot capped at 5,000 nodes / 20,000 edges | 2000 ms pre-start soft check; 5000 ms sidecar hard deadline | Layout nodes for one existing graph hash. Authenticated sidecar compute runs outside the write lock; plugin promotion rechecks the hash under a short lock. Target/stress tiers may continue showing stale coordinates. |
| Tag vocabulary validation/index | <= 25,000 entries, <= 50,000 global aliases, <= 10,000 abbreviations, <= 256 facets; per-entry alias/abbrev lists <= 256 | 2000 ms explicit-operation budget | Validation rows or search rows. The synchronous engine is checkpoint-capable and performs no persistence or Host I/O; canonical mutation validation remains transaction-local. |
| Concept KB index/query | <= 25,000 concepts, <= 100,000 senses, <= 250,000 aliases, <= 256 aliases per concept, <= 100 query labels | 2000 ms explicit-operation budget | Search rows, unambiguous overlay entries, or exact concept/alias matches. The asynchronous engine is checkpoint-capable and performs no persistence; projection promotion and public DTO assembly remain application-owned. |
| Topic Graph index | <= 25,000 nodes, <= 100,000 edges | 2000 ms explicit-operation budget | Sorted root and unplaced topic identifiers. The asynchronous engine is checkpoint-capable and performs no persistence; complete projection assembly, diagnostics, and registry promotion remain application-owned. |
| Topic structured artifact assembly/validation | JSON depth <= 32, arrays <= 25,000, object properties <= 1,024, total nodes <= 1,000,000, each string <= 1 MiB, aggregate string content <= 32 MiB | 2000 ms explicit-operation budget | Complete/patch manifest validation, artifact assembly/validation, or section read-set patch computation. The asynchronous engine checkpoints every 256 traversed nodes and performs no IO or persistence; canonical-write lock restructuring is deferred to WS4. |
| Zotero related-items sync | scoped source refs or batched full accepted edges | 2000 ms per 100 accepted library edges | Accepted library-to-library citation edges resolved from ready graph cache or sidecar fallback. |
| Topic discovery apply-time match | active topics for one literature | 2000 ms | Active topic count. |
| Topic discovery repair | 500 topic-literature pairs | 2000 ms | Bounded pairs. |
| Topic source check | one topic | 2000 ms | Saved source count. |
| Import preview/apply | 1000 rows/files | 3000 ms | Input rows or files. |

Default explicit operation slice budget is 2000 ms. Long operations should stop at budget boundaries, commit bounded progress, and let the user continue, retry, or cancel rather than blocking the Zotero UI.

Citation Graph build and Tag Vocabulary index construction remain in-process
production readiness exceptions to slice cancellation. Wire-bounded Citation
Graph build requests may exercise an authenticated internal canary, but no
production rebuild calls it. Citation Graph layout and complex metrics use the
same worker as production routes; layout retains its existing pre-start soft
budget check. Those three monolithic operations use 8 MiB UTF-8
request and response envelopes, at most 250,000 request and 50,000 response JSON
structural nodes, one active task, two waiting tasks, a five-second hard
deadline, 100 ms cancellation grace, and a 500 ms pool shutdown budget. General
and system requests retain the 1 MiB cap. The byte envelope remains independent
from the graph engines' 5,000-node/20,000-edge bounds, so an engine-valid but
wire-oversized DTO fails closed. Graph build's larger 25,000-source /
1,250,000-reference / 750,000-target contract therefore uses a separate bounded
staging capability before any future production routing. Transfer pages cap at
4 MiB / 100,000 JSON nodes, each direction at 256 pages / 1 GiB, and the service
at two sessions / 2 GiB; five-minute idle and thirty-minute absolute TTLs bound
retention. Staging validates one page at a time. Explicit `execute` sends one
canonical page at a time to the shared worker, applies a 30-second active
deadline, and publishes output only after attempt commit. The lazy worker and
O(1) health and transfer snapshots keep
supervisor steady-state overhead low. The plugin retains DB reads and
hash-guarded promotion, and unavailable/busy/failed compute preserves stale
coordinates or previous metrics without wait, retry, or in-process fallback.
Canary failures cannot affect production graph state. Tag canonical
validation remains synchronous inside the repository transaction.

The reproducible Citation Graph build data-path benchmark is
`npm run benchmark:synthesis-citation-graph-build-sidecar -- --profile <canary|boundary|normal|target|stress>`.
Core 200 hard-gates deterministic fixture shape, semantic parity, and wire
classification; absolute CPU, memory, event-loop, cancellation, and phase
timings remain report-only observations. The 2026-07-17 baseline found that the
2,000-source/20,000-reference boundary has a 5,045,133-byte / 460,027-node
request and a 9,875,145-byte / 887,045-node response. The normal
2,000-source/100,000-reference fixture has a 24,965,093-byte / 2,220,027-node
request and a 71,757,129-byte / 6,714,045-node response; its direct kernel
completed on the capture host, but strict result rebuilding exceeded seven
seconds and the worker hit its five-second deadline. Target and stress
materialization exhausted the isolated benchmark parent. These measurements
reject direct monolithic production routing and do not establish target/stress
budgets. Core 202 separately hard-gates packed streaming execution for the
2,000-source/100,000-reference normal profile under the 256 MiB worker old
generation limit; larger profiles remain report-only.
See `artifact/synthesis_citation_graph_build_sidecar_baseline_20260717.md`.

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
