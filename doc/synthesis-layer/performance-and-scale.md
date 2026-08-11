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

The production repository foundation v2 contains 53 tables and 46 indexes. Rust
serializes all mutation transactions through one writer and provides at most
four read-only connections for bounded UI/status reads. Startup validates the
schema and reconciles orphaned running operations before readiness; health and
handshake use maintained snapshots rather than table scans.

Citation Graph mutations are admitted by their production operation controller.
Graph reads use repository windows with query and DTO bounds independent of
unrelated graph state. Structure, complex metrics, and layout compute remain
outside the writer transaction, and promotion rechecks the active graph or
durable-fact basis through the single writer.

Reference Refresh captures Host item and artifact identity once per operation,
determines the changed source set, and processes source-keyed batches. At most
two ordered artifact reads are active; no batch reloads the full source,
artifact, raw-reference, or binding state. Completed batches remain durable and
retry converges from current descriptor hashes.

Topic list pages use compact joined repository queries whose count is constant
between the 2k and 25k fixtures. Detail, resolver, resolved-set, canonical body,
and projection payloads load only on targeted reads. Large Topic assets are
staged through authenticated transfer and applied from a bounded control
manifest.

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
| Advanced reference matching | <= 25,000 indexed papers and <= 750,000 binding/dedupe records; three candidates per binding; cluster blocks <= 30 and pair budget <= 3,000 | 3000 ms per slice; 15 minutes per worker phase; 30 minutes per accepted operation | Indexed papers, processed references, auto-accepted matches, proposals created, rejected proposals preserved. Both engine passes compute outside the write lock and promote atomically after Host/repository basis recapture. |
| Reference binding review candidate generation | selected canonical references or source refs | 3000 ms per slice | Candidate blocks or references. |
| Citation graph cache incremental refresh | affected source refs | 1500 ms per slice | Source refs, rebuilt outgoing edges, affected nodes, and light metrics. |
| Citation graph cache rebuild | full or source slice; build contract capped at 25,000 sources / 1,250,000 references / 750,000 external targets | 3000 ms per slice | Active references, effective canonical references, bindings, nodes, edges, ownership, incoming groups, and light metrics. Durable facts are captured under a short lock; Host reads and build-engine compute run outside it; promotion recaptures the basis. |
| Citation graph complex metrics | one canonical snapshot capped at 5,000 nodes / 20,000 edges | 30 seconds per worker phase; 120 seconds per accepted operation | Fixed phases or metric rows. Authenticated sidecar PageRank/component/role computation runs outside the write lock; promotion rechecks the graph hash under a short lock. |
| Citation graph layout rebuild | one deterministic default projection capped at 20,000 nodes / 80,000 endpoint-closed edges | 2000 ms pre-start soft check; 90 seconds per worker phase; 120 seconds per accepted operation | Library nodes precede shared external nodes; single-source supplemental external nodes are excluded. Valid self-loops remain graph facts and part of the graph hash but are omitted from coordinate calculation after validation. Authenticated sidecar compute runs outside the write lock; promotion rechecks the full graph hash under a short lock. Target/stress tiers may continue showing stale coordinates. |
| Tag vocabulary validation/index | <= 25,000 entries, <= 50,000 global aliases, <= 10,000 abbreviations, <= 256 facets; per-entry alias/abbrev lists <= 256 | 2000 ms explicit-operation budget | Validation rows or search rows. The synchronous engine is checkpoint-capable and performs no persistence or Host I/O; canonical mutation validation remains transaction-local. |
| Concept KB index/query | <= 25,000 concepts, <= 100,000 senses, <= 250,000 aliases, <= 256 aliases per concept, <= 100 query labels | 2000 ms explicit-operation budget | Search rows, unambiguous overlay entries, or exact concept/alias matches. The asynchronous engine is checkpoint-capable and performs no persistence; projection promotion and public DTO assembly remain application-owned. |
| Topic Graph index | <= 25,000 nodes, <= 100,000 edges | 2000 ms explicit-operation budget | Sorted root and unplaced topic identifiers. The asynchronous engine is checkpoint-capable and performs no persistence; complete projection assembly, diagnostics, and promotion remain Rust-application-owned. |
| Topic structured artifact assembly/validation | JSON depth <= 32, arrays <= 25,000, object properties <= 1,024, total nodes <= 1,000,000, each string <= 1 MiB, aggregate string content <= 32 MiB | 2000 ms explicit-operation budget | Complete/patch manifest validation, artifact assembly/validation, or section read-set patch computation. The asynchronous engine checkpoints every 256 traversed nodes and performs no IO or persistence; canonical writes execute through the Rust application's serialized promotion boundary. |
| Zotero related-items sync | scoped source refs or batched full accepted edges | 2000 ms per 100 accepted library edges | Accepted library-to-library citation edges resolved from ready graph cache or sidecar fallback. |
| Topic discovery apply-time match | active topics for one literature | 2000 ms | Active topic count. |
| Topic discovery repair | 500 topic-literature pairs | 2000 ms | Bounded pairs. |
| Topic source check | one topic | 2000 ms | Saved source count. |
| Import preview/apply | 1000 rows/files | 3000 ms | Input rows or files. |

Default explicit operation slice budget is 2000 ms. Long operations should stop at budget boundaries, commit bounded progress, and let the user continue, retry, or cancel rather than blocking the Zotero UI.

Ordinary control and page DTOs target 768 KiB and have a 1 MiB hard limit.
Large Topic assets, artifact/review content, and exports use the authenticated
transfer, locator, or delivery path. Large Citation Graph builds use bounded
canonical pages and atomic attempt output; the Rust application owns basis
recapture and repository promotion. Full-library and worker-backed mutations
return `SynthesisPublicMaintenanceOperation` promptly, then expose bounded
phase progress, explicit cancel/continue/retry controls, and one terminal.

The governed production-route checker executes TypeScript native composition,
HTTP, Rust dispatch, SQLite, workers, and reverse Host over 2k, 10k, and 25k
fixtures. Its deterministic gates require:

- Topic page SQL query count to remain constant from 2k to 25k.
- Graph slice and metrics reads to stay within 20 SQL queries, 768 KiB, and the requested result window.
- The 10k Reference refresh to scan Host item/artifact identity once, read only the 50 changed papers' bounded artifacts, and keep artifact-read concurrency at two or less.
- Tag effects to use Host batches of at most 100.
- At 10k, chrome p95 <= 1 second; Topic page, Graph slice, and Graph metrics p95 <= 1.5 seconds; Index, a 50-paper Reference refresh, and Tag effects p95 <= 2.5 seconds; incremental UI-read RSS < 128 MiB.
- At 25k, each UI read to return a bounded result or explicit degraded state within 2.5 seconds, with no full-library DTO materialization.

Every formal operation records request/response bytes, SQL query/write counts,
Host calls, p50/p95 latency, receipt latency where applicable, and RSS. The
2026-08-08 local run passed every governed 2k/10k/25k performance gate for the
recorded executable source identity. This remains candidate evidence: the
repository-wide strict OpenSpec, format, lint, TypeScript, Rust, and production
build gates also passed, while the local run does not authorize seven-platform
prebuilds, final packaging, signing, or release.

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
