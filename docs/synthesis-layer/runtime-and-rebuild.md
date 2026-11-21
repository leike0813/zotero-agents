# Runtime and Cache Refresh

## Native Runtime and Migration Boundary

The supervised runtime is the Rust executable bundled with the installed XPI.
The strict manifest-v3 installer materializes one verified `current` directory.
There is no independent sidecar updater, version generation, admission,
cutover, activation, or runtime rollback.

Startup writes one strict launch-config v4 containing production database,
canonical, reverse Host, runtime identity, session-token, and optional bounded
startup-trace fields, then runs `serve --config`. Rust holds
`state/synthesis.lock` as an exclusive OS file lock before opening production
storage. Session discovery, authenticated health, and authenticated handshake
are sufficient to publish the native client.
Receipt, owner, lease, pointer, and activation files are not runtime inputs.

If the production database, SQLite sidecars, and canonical root are all absent,
Rust initializes the database and canonical root while holding the lock. A
partial combination fails with `synthesis_source_state_incomplete` without
constructing the missing half.

One registered adoption path handles the final TypeScript-owned database marker
`2026-06-01.sidecar-cache-hard-cut`. It first classifies the source without
writing: released v0.5-v0.6, released v0.7-v0.8.3, development planning-only,
and development planning-plus-screening are explicit supported profiles. Each
profile is normalized through the same typed intermediate facts, preserving
present values and filling only fields that did not exist in that historical
shape. This provides staged compatibility without running an old executable or
rewriting the source in place. Any unrecognized table/column shape fails as
`legacy_schema_variant_unsupported` before a backup or candidate is created.

Before publishing anything, Rust cross-checks the legacy Topic graph,
definitions, resolvers, resolved paper sets, and every canonical current tree.
It then creates one verified backup under
`state/synthesis-migration-backups`, builds and validates a sibling foundation
v3 database, and publishes it atomically. Existing canonical files remain
byte-identical; only the production identity marker is added after database
publication. Unsupported schema drift, source conflicts, build failures, lock
conflicts, or identity mismatches fail closed. The next explicit supervisor
recovery can rebuild a failed candidate; it never mutates or retries through a
legacy production owner. The next successful startup opens the current stores
directly and creates no additional migration backup.

Installing a new XPI replaces the packaged sidecar. The next startup verifies
the new bundle and atomically replaces `current`. Same-schema startup creates no
backup. A future schema change must register its exact migration in Rust; only
that path creates a verified migration backup immediately before applying a
transactional migration.

The active production route is therefore the receipt-bound native
`SynthesisClient` composition. The plugin retains only the Host adapters that
cross the closed reverse-Host boundary; legacy in-process composition and its
default-service cache are not permitted to own production data or service a
normal request. The detailed capability descriptions below identify domain
adapters and bounded Host effects, not a second production owner.

The production owner injects the sidecar-backed `SynthesisClient` after the
authenticated Rust handshake succeeds. Rust owns the production Synthesis
application, SQLite state, canonical Topic files, and bounded workers; the
Zotero plugin owns UI orchestration and reverse-Host adapters for Zotero,
credentials, filesystem delivery, and network authority. Ordinary control and
page DTOs target 768 KiB and have a 1 MiB hard limit. Large Topic assets,
artifact/review bodies, and exports use authenticated transfer, locator, or
delivery paths instead of widening that control envelope.

Full-library and worker-backed mutations return
`SynthesisPublicMaintenanceOperation` within the short control-plane
deadline. The shared operation manifest separately persists an explicit work
deadline for every such capability; the ten-second control bound never becomes
the accepted worker's execution bound. One public-maintenance lifecycle module
owns admission, dispatch, progress, control, restart classification, and typed
receipt projection for every such route. Each terminal compare-and-set winner
publishes one success, failure, cancellation, or timeout event; callers poll the
read-only operation API and use the control extension for cancel, continue, or
retry. Reverse-Host calls keep their capability-specific bounds, including the
larger hash-guarded artifact-read path.

All normal Synthesis capabilities enter through the native
production manifest, including native planned-topic context and plan-apply
routes. TypeScript
composition owns grouped-client validation, UI orchestration, large-content
staging/resolution, and reverse-Host adapters. Rust owns typed domain dispatch,
application behavior, repository transactions, canonical Topic files, and
workers. Zotero item objects, preferences, credentials, local delivery paths,
and raw Host errors never cross the public client contract. The retained
TypeScript client port adapter contains mapping and validation only; there is
no plugin application/repository owner or executable Node Synthesis service.

Each native capability call starts one manifest transport budget before
connection recovery or input preparation. DTO construction, input staging,
business RPC, and output reads consume that same absolute window; each network
phase receives only the remaining time. Cancellation or expiry prevents the
next page, seal, or business dispatch. This does not combine the multiple native
calls and Host delivery inside high-level `getTopicContext` into a transaction.

Composition invalidation synchronously rejects new admission and cancels local
business waits, including recovery and non-cooperative RPC waits. Disposal
returns one shared completion promise and drains only that composition's calls
and known transfer cleanup. Fresh default-client acquisition and shutdown await
this drain; old-generation cleanup cannot cancel replacement-generation work.
The cancellation signal does not require a native `AbortController`.

Known input and output sessions each receive an independent 1000 ms cleanup
window, without the business signal or exhausted deadline. Input and output
cleanup can therefore add two separate one-second tails. Cleanup failure does
not replace the business error, and reverse-Host consumers retaining an output
session keep ownership. If begin was sent but no session identity was received,
local disposal cannot confirm remote cleanup; existing server reaping retains
its five-minute idle and thirty-minute absolute limits.

Local cancellation is reported as `unavailable` with
`details.sidecarCode: request_canceled`; local budget expiry is `timeout` with
`request_timeout`. Neither result proves that a remote write was rolled back.
Disposal does not send durable maintenance cancel, retry work, or wait for its
worker. An accepted maintenance receipt remains queryable by the same
`operation_id` from a replacement composition through its durable terminal.


The Stage 1 seam/oracle history is documented in
`artifacts/archive/synthesis_sidecar_service_stage1_refactor_plan_20260715.md`; the Rust
continuation is documented in
`artifacts/archive/synthesis_sidecar_rust_migration_plan_20260718.md` and the active
OpenSpec changes. Those historical Node oracle descriptions are fixed migration
evidence, not current source inventory. Production supervision accepts only a
verified `rust-native` manifest identity and an absolute native executable.

The durable and application parity corpora fix repository foundation v5 at 62
tables and 51 indexes, together with SQLite PRAGMAs, canonical bytes/hashes,
fault points, public DTOs, stable codes, journal/receipt state, and reopen
behavior. The complete v1→v2→v3→v4→v5 registry runs as one ordered transaction
with one verified backup. It preserves Topic, approved binding/redirect/review,
operation, sync, last-good projection, planned-topic payload, and discovery
screening facts while marking rebuildable cache state stale. Production uses
one serialized writer and at most four read-only connections. Seven-platform
candidate execution is evidence only and does not publish or synchronize
assets.

The Reference redirect graph uses the dedicated
`synthesis-reference-redirect-graph.v2` identity. A legacy candidate validates
preserved fact counts, repairs redirect cycles, records the repair receipt, and
only then publishes the v2 marker and database. A v1 or unversioned current
database follows the same repair under one transaction after creating or
verifying its source-bound backup; unknown identities fail closed. Reference
cache diagnostics cross a closed public projection that accepts only bounded
diagnostic objects from persisted state. Storage-internal strings and malformed
fields do not enter Workbench Index or Review DTOs.

Plugin startup non-blockingly installs, launches, discovers, and supervises the
native production owner. Startup reconciliation runs after current-session
readiness. Restart, transport, deadline, worker, or identity failures do not
retry through Node or a plugin production owner.

Remote Topic Context and filtered paper-artifact delivery cross the bounded `SynthesisHostExportDeliveryPort`. The application builds canonical text entries; the production Host adapter owns temporary ZIP bytes, integrity metadata, opaque Host Bridge file registration, and cleanup. Port absence or malformed/unavailable receipts fail the remote request without a local-path fallback. Local output-path and ACP run-root writes are unchanged. The readonly composition does not inject remote export delivery.

Citation Graph layout computation crosses the environment-neutral `SynthesisCitationGraphLayoutEngine` seam. The application derives a deterministic shared layout projection: active library nodes precede shared external nodes and then single-source external nodes, each tier is ID-sorted, and retained edges are endpoint-closed. Overview edges retain priority within the edge cap. The Workbench overview keeps its existing source-degree admission independently of layout coverage. Layout version 3 identifies this expanded coverage; earlier coordinates remain usable only through explicit stale reads. It projects one full graph hash plus at most 20,000 nodes and 80,000 edges into canonical compute DTOs, awaits the authenticated sidecar worker without holding the library write lock, then reacquires a short lock and promotes only if the current DB graph hash still matches. Superseded or failed results preserve the previous layout content. The command returns its receipt within the ten-second control deadline; accepted layout work has a 120-second operation deadline and its paged worker phase has a 90-second deadline. The pool still has one active task and two waiting tasks. Complete UTF-8 request and response envelopes remain independently capped at 8 MiB; compute request JSON is capped at 1,000,000 structural nodes and compute response JSON at 200,000, with depth 32 and 64 KiB strings. These wire limits do not promise transport for every theoretical maximum-string DTO admitted by the engine count bounds. Oversized traffic fails without truncation, compression, persistence, retry, or in-process fallback. Request ID and service-instance identity are validated before strict result rebuilding and graph-basis promotion.

Citation Graph complex metrics cross the sibling
`SynthesisCitationGraphMetricsEngine` seam with independent 5,000-node and
20,000-edge bounds. The Rust application captures graph rows and persistence
mappings through bounded repository reads, executes PageRank/component/role
compute in the Rust worker without holding the writer, and rechecks the graph
hash before replacing complex metrics. Full rebuild, source-slice incremental
refresh, and explicit metrics refresh use this one path. A superseded or failed
result preserves previous metrics; graph structure remains readable while
metrics report stale or missing state.

Citation Graph structure construction crosses `SynthesisCitationGraphBuildEngine`. Runtime reads current Reference and cache facts, selects Full or Incremental mode, and prepares one application-owned graph attempt before reverse-Host collection. `finish_rebuild` consumes that attempt with canonical material or a typed collection failure. Build compute stays outside writer ownership. Full and source-slice promotion commit graph state/rows, `citation-graph:library=ready`, and the private attempt terminal together. Large builds use authenticated canonical transfer pages and atomic attempt output; the worker has no repository, canonical-file, Host, or staging-path authority. Superseded, malformed, canceled, collection-failed, or oversized attempts preserve the last-good graph. Input pages, output sinks, and adopted publications carry typed byte reservations; moving ownership does not change the aggregate count, and dropping the final owner releases it once. Idle reaping skips active attempts. Absolute expiry, explicit cancel, and shutdown hide and cancel an active session first, then remove its files only after the attempt returns.

Workbench Citation Graph reads use an application-owned basis-bound view over repository windows. The first Graph
surface response contains at most 200 ranked primary nodes, 400 primary edges,
100 hover-only nodes, and 200 hover-only edges; the sidecar deterministically
shrinks a page when its serialized graph payload would exceed 768 KiB. Each
edge page is endpoint-closed. SQLite remains the source of graph structure,
counts, filters, and stable ordering. Graph layout data is read through the same view; cross-domain Topic scope stays runtime-owned. A versioned opaque cursor binds the graph hash and normalized query signature to the four repository offsets. Each page, continuation, neighborhood, metrics, or layout call opens a short reader transaction and rechecks graph/input/metrics identity. A changed graph, filter, topic, metrics, or layout basis fails with `basis_mismatch` instead of mixing results.
Only a `ready` layout is decoded as current layout JSON and coordinates.
Running, failed, stale, or otherwise non-ready layout rows contribute status
metadata with no coordinates, so an obsolete layout format cannot hide the
last-good graph. Malformed ready layout data remains a typed repository error.

While Graph is selected, the Host reads one page at a time and the iframe
merges ID-keyed patches into the existing Graphology/Sigma instance. Page-only
updates preserve the camera, canvas, selection, controls, and drawers. Leaving
Graph, changing a server filter, invalidating the graph, changing layout, or
cleaning up the runtime advances the Host generation; any older in-flight page
is discarded. Interactive loading pauses after 10,000 nodes or 20,000 edges,
and each explicit continuation grants the same additional allowance. A failed
page keeps the accumulated window available for retry. One-hop incoming,
outgoing, and bidirectional expansion uses the same graph/query basis and merge
path without advancing the sequential cursor. Topic HTML export independently
drains every page for every exported layout and fails with a typed safety-limit
error rather than emitting a partial graph.

The governed benchmark exercises TypeScript native composition, HTTP, Rust
dispatch, SQLite, workers, and reverse Host. Earlier monolithic graph evidence
established why large graph bodies cannot use the general JSON envelope; the
production path therefore uses authenticated paged transfer while the Rust
application retains basis recapture and repository promotion. Transfer failure
or cancellation cannot publish partial graph state.

Concept KB search, overlay, and bounded exact label/alias queries cross
`SynthesisConceptKbIndexEngine`. The application reads and sorts SQLite-owned
concept, sense, and alias rows, supplies the current manifest basis for index
construction, and strictly rebuilds the asynchronous result before projection
promotion or public DTO assembly. Relations, review items, proposal
merge/create/review, manifests, diagnostics, and mutations stay application
owned. Failed, cancelled, malformed, or oversized computation preserves the
last projection registry state and durable rows. The Rust application owns
production promotion and public result assembly; the plugin calls it through
the authenticated client.

The full data-boundary decision is in [Library SSOT and Sidecar Cache](./library-ssot-and-sidecar-cache.md).

## Runtime Principles

- Zotero Library metadata is paged or resolved by stable ref through the Host read port when correctness matters.
- Source artifact scans return descriptors only; content is read one opaque locator at a time with the scanned hash.
- Representative-image enrichment is opt-in and best-effort. It reads only a requested digest note, requires a note-child image attachment, limits decoded content to 2 MiB, and never makes digest markdown availability depend on the image result.
- Remote export delivery accepts at most 256 text entries, 5 MiB per entry, and 50 MiB total; archive paths are relative and unique, and no local temporary path crosses the Host port.
- Citation Graph layout compute accepts the deterministic default projection at up to 20,000 nodes and 80,000 endpoint-closed edges, never holds the library write lock during kernel execution, and requires a matching full graph hash at promotion.
- Citation Graph metrics compute runs only in the Rust child, uses the same limits, never holds the library write lock during PageRank/component/role computation, and replaces rows only for the captured graph hash.
- Citation Graph build compute accepts at most 25,000 source nodes, 1,250,000 reference instances, and 750,000 external targets, keeps Host reads and assembly outside the write lock, and replaces rows only for the captured durable sidecar-fact basis.
- Advanced Reference Matching uses one bounded engine with separate binding and canonical-dedupe contracts. It captures repository facts under a short lock, computes both passes outside the lock, recaptures Host and repository basis, and atomically promotes accepted facts and proposals only when the basis remains current. The accepted operation has a 30-minute work deadline; each binding or canonical-dedupe worker phase is bounded to 15 minutes and still checks the remaining operation deadline.
- Tag Vocabulary validation and index construction use one strict engine capped at 25,000 entries, 50,000 aliases, 10,000 abbreviations, and 256 facets. The Rust application computes through two paged operations outside SQLite, recaptures the vocabulary revision, and promotes by CAS inside the Rust-owned repository transaction. Index failure or malformed output cannot advance active index state.
- Concept KB index and query computation uses one strict asynchronous engine capped at 25,000 concepts, 100,000 senses, 250,000 aliases, 256 aliases per concept, 100 query labels, and 4,096 code units per string. The Rust production application invokes the bounded worker, promotes only against the captured manifest, and never writes during query.
- Topic Graph index computation uses one strict asynchronous engine capped at 25,000 nodes, 100,000 edges, and 4,096 code units per string. The Rust production application owns graph/review rows, proposal decisions, discovery coordination, public DTOs, and basis-guarded index promotion.
- Topic Structured Artifact computation uses strict manifest validation, assembly, artifact validation, and section-patch operations. The Rust production application owns use-case policy, repository metadata, and downstream coordination. The canonical store owns Topic path and hash derivation, representation validation, transport-neutral assets, transaction identity, and opaque prepared promotion; Zotero and export file authority crosses bounded reverse-Host ports.
- Synthesis runtime packaging supports Windows x64, macOS x64/arm64, and Linux x86/x64/arm/arm64. Installation reads only packaged assets and writes only `runtime/synthesis/service-runtime`. The supervisor launches only the verified absolute product runtime with a sealed environment and never resolves system commands.
- Synthesis sidecar state is a cache projection unless it records a user-approved reference/binding/dedupe decision.
- Workbench snapshot reads must not create or drain background work.
- Service construction and ordinary progress, chrome, client, and debug reads must not reconcile or mutate operation lifecycle state.
- Explicit startup runtime reconciliation fails a public-maintenance `running` operation with `restart_external_effect_unknown`, changes public-maintenance `pending` work to `continuation_required`, and cancels other persisted `running` operations with `synthesis_operation_stale_after_restart`; elapsed time during a live process is not a cancellation signal and startup dispatches no work.
- Workbench UI reads are surface-scoped: chrome/status, Index, Review, Graph, Tags, Concepts, and Topics are separate read models.
- Normal startup must not reconcile the whole Zotero Library into Synthesis.
- Long work must be user/debug-triggered, scoped, cancellable when practical, and visibly stale-tolerant.
- Dirty events, WorkItems, WorkRuns, startup reconcile, queue drain, Registry rebuild, and registry epochs are removed implementation targets.

## Normal Runtime Flow

Reference and Canonical Reference client routes share one production
`ReferenceApplication`. The runtime retains maintenance admission,
cancellation/deadline lookup, terminal transitions, reverse-Host transport,
and wire codecs. Each durable application call receives a checkpoint for the
current invocation. Shutdown quiesces the composed Refresh and Matching owners
through the same application before compute and storage owners are released.

Normal workflow apply is the only automatic sidecar update path:

1. `literature-analysis` reads Zotero item/attachment/note data directly.
2. The workflow writes digest/reference artifacts to Zotero notes or embedded payload attachments.
3. Host apply updates bounded sidecar projections for that `source_ref`: artifact existence/hash state, changed references extraction, canonical-reference dedupe, and optional literature matching metadata.
4. Topic create/update reads Zotero Library metadata and source artifacts through the Host read port. Citation graph metrics may be included only as optional enrichment.
5. Topic apply updates topic artifact sidecars, source manifest summaries, discovery profile metadata, and Concept/Topic Graph proposals.

No step above requires a full Registry rebuild, startup reconcile, or global dirty queue drain.

`client.applyLiteratureDigestSidecar` admits its strict workflow DTO under the
1 MiB production request budget, including a single string larger than the
ordinary 64 KiB capability limit. Rust canonicalizes the three artifact
descriptors and projects changed references, citation roles, stable bindings,
and bounded literature-matching metadata through the existing Reference
Refresh application. Artifact rows, reference projection, metadata, cache
basis changes, and the success receipt commit in one SQLite transaction. A
validation, preparation, or commit failure leaves none of those writes behind.
Repeating the same canonical request returns the stored `sidecar_applied`
result as an idempotent success. Digest-only changes update artifact and
metadata state without rebuilding raw references; Citation Graph and
related-items cache become stale only when reference, binding, or role facts
change. Recovery is a later retry of the same workflow apply; there is no Node
fallback or partial-success receipt.

## Explicit Cache Operations

Broad maintenance is explicit:

| Operation                                | Trigger                                                                                                                        | Writes                                                                                                                                                                                                                                     | Does Not Do                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Artifact cache sync                      | digest/topic apply for one item/topic                                                                                          | selected artifact existence/hash projection rows                                                                                                                                                                                           | scan unrelated Zotero items or persist Zotero item metadata                                                                          |
| Reference sidecar refresh                | user/debug selects item/library scope                                                                                          | artifact sidecar scan/diff, changed raw-reference extraction, canonical-reference dedupe, safe best-effort binding, `reference-sidecar:library=ready`, and stale Citation Graph / related-items sync diagnostics with changed source scope | full library metadata projection, hidden graph refresh/rebuild, graph layout rebuild, related-items sync, or user approval decisions |
| Reference binding repair/review          | user starts review flow                                                                                                        | accepted/rejected binding, merge, dedupe, or retarget decisions                                                                                                                                                                            | silently rewrite Zotero item metadata or run from ordinary refresh                                                                   |
| Citation graph cache incremental refresh | user refreshes a stale graph, or Advanced Matching / proposal review changes graph-affecting sidecar facts                     | affected source-slice graph nodes, edges, incoming groups, source ownership, and light metrics; graph readiness is committed before shared complex-metrics compute                                                                         | scan artifacts, extract references, run matcher, rebuild layout, or topic work                                                       |
| Citation graph cache rebuild             | user opens Graph rebuild/debug command, or allowed bootstrap after Advanced Matching when graph cache is missing               | graph nodes, edges, and light metrics from active raw references, effective canonical references, and bindings; graph readiness is committed before shared complex-metrics compute                                                         | scan artifacts, extract references, run binding review, rebuild layout, mark topics changed                                          |
| Citation graph metrics refresh           | full rebuild, incremental refresh, or explicit metrics command                                                                 | metrics v2 rows promoted only when the current graph hash still matches the captured basis                                                                                                                                                 | rebuild graph structure, hold the write lock during CPU computation, or remove previous rows on failure                              |
| Citation graph layout rebuild            | user opens layout/debug command                                                                                                | bounded engine coordinates for an existing graph hash and preset, promoted under a short hash-check lock                                                                                                                                   | rebuild graph data, refresh reference sidecar, or activate a production worker                                                       |
| Topic source check                       | user/debug/maintenance request for selected topic                                                                              | source-check diagnostic from direct Zotero/artifact reads                                                                                                                                                                                  | read reference or graph cache as truth                                                                                               |
| Topic discovery repair                   | user/debug bounded repair                                                                                                      | bounded hint rows                                                                                                                                                                                                                          | global LLM n x m judging                                                                                                             |
| Related-items sync                       | successful manual stale graph refresh, Advanced Matching fact changes, proposal review fact changes, or explicit/debug command | Zotero native relation effect rows and diagnostics from accepted library-to-library citation edges                                                                                                                                         | rebuild graph cache, extract references, run matcher, mutate sidecar facts, or delete unproven user-created Zotero relations         |
| Reset/import/export                      | protected command                                                                                                              | sidecar state according to declared scope                                                                                                                                                                                                  | silently import legacy JSON into runtime                                                                                             |

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

| Situation                                       | Target Behavior                                                                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User opens a topic                              | Source check compares the topic source manifest with current bounded Host metadata/artifact reads for that topic.                                         |
| User opens Graph                                | Graph view may show missing/stale/failed cache and offer citation graph cache rebuild.                                                                    |
| Digest is applied                               | Only that item's artifact/reference sidecar projection is updated; Citation Graph and related-items sync are marked stale with source-scoped diagnostics. |
| Large Zotero changes happened outside Synthesis | UI/debug may recommend explicit reference sidecar refresh or binding repair.                                                                              |
| Structural inconsistency is suspected           | Fail closed for cache writes and ask for inspect/repair; do not generate per-item fan-out.                                                                |

Startup may do repository health checks, explicitly reconcile persisted non-terminal operation receipts, and perform phased Workbench read-model warmup. Repository open itself does not classify lifecycle state. The reconciler reads stable bounded operation-ID pages: public maintenance `pending` rows require explicit continuation, public maintenance `running` rows fail because their external-effect outcome is unknown, and other stale `running` rows are canceled. It must not reconcile sidecar cache, enqueue work, replay old operations, or start refresh. Warmup is not a maintenance operation: it may read bounded surface state, fill in-memory UI cache, and yield between phases, but it must not write domain cache rows.

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

The Rust production Reference application implements this boundary as
`prepareRefresh` plus `applyRefresh`. It captures Host item and artifact
identity once, compares payload-free descriptors, and reads only changed
Reference and same-source citation-analysis artifacts. Source batches contain at
most 100 refs, with at most two ordered artifact reads active at once. Each
promotion is source-keyed and basis-guarded; a final payload-free sweep removes
sources no longer present.

Each successful batch performs its own reference-hash CAS and becomes readable immediately. A measured multi-source overflow discards its preparation and is split in half; a single-source overflow returns `reference_refresh_payload_too_large` with measured and configured capacity. Later failure or deadline exhaustion stops new batches but retains completed batches and reports processed/failed source refs for retry. Retry compares current descriptor hashes and does not reread a completed source that remains current. Once every current source converges, one payload-free full-scope sweep removes sources no longer present in Zotero. Missing, extra, duplicate, stale, or mismatched payloads still consume their preparation before any batch write. Parsing and quality/canonical/binding projection run outside SQLite, and every promotion rechecks the active reference hash in one transaction. Advanced Matching, generic review mutations, graph execution, related-item effects, and preparation paging beyond the 8 MiB/250,000-node descriptor bound remain outside this boundary.

Reference sidecar refresh is the broadest ordinary maintenance operation and must stay cheaper than the old Registry rebuild.

Stage 1 scans artifact sidecar state:

1. Enumerate the selected Zotero source scope through bounded pages or stable-ref lookup.
2. Scan digest, references, and citation-analysis descriptors without payload content.
3. Update artifact sidecar existence, locator, fingerprint/hash, and diagnostics.
4. Compare `references_hash` against the previous sidecar row and build a changed set.

Stage 2 processes only changed references artifacts:

1. Mark old active raw references for disappeared or replaced `source_ref + references_hash` values as `stale`.
2. Read and parse only changed references artifacts by opaque locator and expected hash; fail stale if the hash changed after scan.
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

Batch review is item-independent: every valid decision gets its own transaction and result even when another proposal is missing or invalid. A completed action receipt records the proposal status before and after that transition. It can be replayed only while the current status still matches the recorded after-state, which preserves same-state idempotency without swallowing Accept → Reopen → Accept or equivalent reversible sequences.

Fuzzy external dedupe is review-only in this version. It runs after deterministic dedupe clusters are formed and compares unresolved singleton canonical references against deterministic cluster representatives and remaining singleton targets under block and pair budgets.

Rejected or accepted decisions are durable sidecar facts, not ordinary cache rows.

## Related Items Sync

Zotero native related-item relations remain Zotero-owned facts. Synthesis may apply accepted library-to-library citation edges only through a visible related-items sync operation with durable provenance:

- create a deterministic pending external-write effect before invoking the Host effect port;
- dispatch at most 25 effects per service batch, while the public Host contract caps a batch at 50;
- validate exactly one canonical receipt per effect before reconciling `applied`, `already_satisfied`, `not_found`, or `failed`;
- never remove a relation without recorded Synthesis-created provenance;
- treat pre-existing relations as `already_existed`;
- leave an uncertain batch pending and stop later dispatch when transport or receipt validation fails;
- preserve an observer echo consumed between Host mutation and receipt reconciliation;
- retry only on a later explicit or domain-triggered sync; startup reconciliation never performs Host writes.

Related-items sync first uses ready graph cache rows when available. If graph cache is missing, stale, failed, empty, or a preceding graph refresh failed, it resolves the same edge set directly from active raw references, effective canonical redirects, and accepted reference bindings. It must not rebuild graph cache or run matcher logic.

Staged Tag Host writes use a separate effect boundary. Current staged rows store only stable `{ libraryId, itemKey }` refs. Startup reconciliation starts a bounded migration for legacy numeric rows, and every staged operation awaits the same gate. Successful migration rewrites affected rows atomically and drops only missing or invalid bindings; infrastructure failure leaves the raw rows unchanged and blocks staged operations until a later retry.

A persisted Tag application state is a CAS basis even when its vocabulary hash
is empty. The empty hash represents the pre-initialization durable state; only
the absence of the singleton state uses a missing expected basis. Built-in
policy initialization and later vocabulary mutations share this distinction.

Promotion commits canonical vocabulary before dispatching Tag effects in batches of at most 50. `applied` and `already_satisfied` receipts project stable `parent_ref` values. Missing ports, transport failures, malformed receipts, missing targets, and mutation failures produce bounded stable diagnostics and never roll back the vocabulary commit. Tag Regulator stages refs and invokes the same promotion seam; it does not resolve or mutate bound parents itself.

`client.listStagedTagSuggestions` remains a no-argument operation whose public
result is the complete `SynthesisTagStagedSuggestion[]`. The native adapter
drains repository pages in batches of 100, requires every continuation cursor
to advance, and returns one deterministic array sorted by update time and tag.
A stalled or inconsistent cursor fails with the stable production projection
error instead of returning a partial list; retry starts a fresh bounded drain.

Legacy Topic mirror items are inert historical data. Normal runtime does not discover, validate, rebuild, recover from, update, or delete them; any future one-shot import requires a separate explicit change.

## Failure Recovery

Use local recovery:

- A failed short transaction rolls back.
- A failed literature workflow apply leaves no partial artifact, reference,
  metadata, cache-basis, or success-receipt state; retry the canonical request.
- A failed cache refresh keeps the previous projection.
- A reverse-Host body that ends before `Content-Length` is complete is rejected;
  retry after the Host transport is healthy.
- A staged-Tag pagination cursor that does not advance is rejected without a
  partial public array; retry after repairing the native projection.
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

## Retrieval Index Maintenance

Index work is explicit maintenance and reuses the existing durable public
operation lifecycle. Reads never start it. The native routes below are
workbench-private adapters, not Workflow, Bridge, or MCP tools, and the Rust
application and routes are still under implementation.

- `retrieval.getState`, `build`, `rebuild`, `update`, `cleanup`, `recommend`,
  and bounded `invalidate` are the target route set.
- A full build or rebuild commits a paused state before encoding and suspends
  all semantic retrieval until publication; an incremental update suspends only
  groups known to be changed.
- Publication is source-group atomic. A group stays unavailable while its
  replacement is incomplete, expected absence is a coverage gap rather than a
  failure, and unreadable or unencodable existing content blocks publication.
- An unreadable Topic in the selected scope fails the maintenance operation.
  The failure receipt and debug trace carry a stable reason such as
  `canonical_snapshot_incomplete` or `canonical_hash_mismatch`.
- Accepted build, rebuild and update can run across the former whole-operation
  deadline. The public maintenance owner admits one retrieval operation per
  data root. Individual source reads and embedding batches retain independent
  deadlines and timed-out steps have separate receipt diagnostics.
- An in-flight document batch observes cancellation while waiting for the Host.
  Canceling the wait closes the reverse Host connection and stops the provider
  request or its retry delay. A retry reuses completed source groups.
- Cleanup and Discovery use a separate post-publication budget. Their failure
  records a tail issue and preserves the successful index.
- Startup, queries, and Home reads never scan sources, encode missing content,
  or resume maintenance. Startup reconciliation keeps the existing
  continuation-required and external-effect-unknown classification and
  dispatches nothing.

### Foreground retrieval budgets

The operation manifest supplies the outer budget for Library, Evidence and
Topic search, dedicated semantic search, and similarity. Encoding, exact
scoring and source verification each have up to 30 seconds within a
120-second foreground limit. Transport grace and result projection use the
remaining time. Mixed searches run the existing bounded lexical work alongside
vector ranking. A timed-out phase preserves verified hits and reports reduced
coverage. Semantic context reads use the source verification budget.

The Broker validates indexed matches using their current source version and
UTF-16 range. Long sources use bounded range reads, including on continuation.

### Host Embedding Configuration

The Host owns connection configuration, endpoint resolution, discovery,
credentials, file reads and embedding HTTP. The sidecar receives only bounded
text, vectors and an encoding identity. Existing OpenAI-compatible and Ollama
connections keep their `baseUrl`, raw model ID, prefix and dimension behavior;
the new flat optional fields on a connection are `embeddingUrl`, `discovery`,
`auth` and common/query/document `parameters`. The new optional fields do not
replace the stored compatibility fields. Parameter JSON is nonsecret request
configuration; authentication credentials remain in the separate encrypted
credential value. Preview, save and discovery use the same unsaved draft;
discovery needs neither a saved connection nor a model ID.

The endpoint resolver accepts a service root, API root or complete endpoint and
preserves proxy path prefixes and query parameters. A complete endpoint is not
suffixed a second time, known API roots receive only the protocol tail, and all
other roots receive the protocol's canonical API path. URL userinfo, fragments
and credential-looking query keys are rejected. An explicit discovery override
can select another supported catalog URL or disable discovery with `none`.
Ollama embedding requests use `/api/embed`; a failed request is not retried by
an automatic legacy `/api/embeddings` route. The embedding URL is derived
automatically from the protocol, base URL and model. A manual override is
retained, and clearing it restores automatic derivation.

| Protocol | Embedding request | Discovery |
| --- | --- | --- |
| OpenAI-compatible | `model` + `input`, float output | `GET /models` |
| Ollama | `model` + `input`, no truncation | `GET /api/tags`, then selected `POST /api/show` |
| TEI | `inputs`, no truncation | `GET /info` |
| Cohere | `model` + `texts`, float output, no truncation | `GET /v1/models` filtered for embedding |
| Voyage | `model` + `input`, float output, no truncation | manual model entry |
| Gemini | per-input content and task type | `GET /models` with page/capability filtering |

Authentication is `none`, bearer, or one validated custom header. Credentials
remain encrypted and separate from the connection snapshot. Protocol adapters
own native envelope, body and response parsing; common parameters are merged
before purpose parameters, and user parameters cannot override model, input,
dimension, output-format or truncation ownership. Ollama `truncate: false`,
Cohere `truncate: "NONE"`, Voyage `truncation: false`, and equivalent protocol
fields prevent silent query shortening.

Requests are split serially at protocol capacity under one operation deadline.
The current adapter capacities are 256 inputs for OpenAI-compatible, Ollama and
TEI, 96 for Cohere, 128 for Voyage, and 100 for Gemini. Queries try each selected
compatible service once. Each protocol-sized document segment has at most three
total attempts including fallback, and retry delays consume the same deadline.
Authentication, model and configuration failures are not retried on the same
service. Every native response must produce one associated vector per input;
every coordinate must round-trip as a finite float32 value at the expected
dimension and the vector norm must be nonzero. Vectors are held until every
split segment succeeds, so a failed segment returns no successful prefix.

`EncodingIdentity` keeps its model, actual dimension, query prefix and document
prefix and may add `encodingOptionsKey`. The key is a canonical JSON hash of the
effective query/document parameter pair, including protocol purpose defaults and
common parameters, after adapter-owned fields are excluded. Endpoint,
credential, connection name and discovery do not enter the identity. When the
effective option pair is empty, OpenAI-compatible and Ollama identities keep the
legacy four-field form and omit the key. Rust accepts an optional key and omits
it when absent; no SQL migration is required, but the Host and sidecar contract
must ship together.

Connection-test invalidation uses a separate request-configuration key rather
than `encodingOptionsKey`. It hashes request-affecting saved configuration,
including endpoint and authentication, with the encrypted credential revision.
Display identity and discovery-only fields are excluded. A changed endpoint or
credential therefore invalidates a prior test without changing a compatible
index identity. An older probe for the same request configuration cannot
overwrite a newer successful result.

Model discovery is explicit and draft-scoped. It can use an unsaved connection
draft and a credential entered for that draft. OpenAI, Ollama, TEI, Cohere and
Gemini expose only catalog-returned identifiers and do not guess unreturned
models. One shared 15-second budget allows at most 20 pages and 1,000 unique
entries; completed rows remain as an explicit partial result when a later page,
deadline, cancellation or bound is reached. Discovery keeps the current model ID
when it remains in the usable candidate list and otherwise selects the first
candidate. Failure or zero usable candidates leaves the model input unchanged.
Canceled, dropped or late responses cannot update the current or another draft.
Failures expose fixed diagnostics without raw response bodies or credentials.
Voyage, Jina and Azure deployment names remain manual. An Ollama `show`
dimensional hint is information only; it does not populate the requested output
dimension. The actual dimension is established by an explicit synthetic probe.

Plain save persists the draft without a network request. Save-and-test validates
the draft, saves the supplied encrypted credential, then saves the nonsecret
configuration before launching fixed synthetic query and document probes. A
failed probe leaves the configuration saved and marks it saved but unverified.
Success records the request-configuration key and credential revision, and a
change to either invalidates old success. Late responses are discarded by
owner/version. Fallback services are filtered by the full effective encoding
identity before primary/fallback order is applied. The complete draft and
selection are validated before either mutation; a persistence failure restores
the previous configuration and encrypted credential and does not start the
probe. The focused regression covers that rollback. Writes for different
connections are serialized so one save cannot lose another connection's
credential-list entry; their probes remain outside that write queue and may
overlap.

The preset catalog contains six protocol service templates, the LM Studio,
vLLM, Xinference, Azure OpenAI and Jina provider presets, and local templates
for `qwen3-embedding:0.6b` and `qwen3-embedding:4b`. The selector displays a
preset only for a complete normalized match of its non-secret connection
configuration; changing a matched parameter displays Custom. Connection names,
credentials and primary/fallback routing are excluded from matching. Presets
fill a new unsaved draft only and start no request, save, primary/fallback
selection, enable, test, activation or index work.

Before a Workbench retrieval RPC is sent, it waits for the production owner
within the existing operation budget. This wait may start the owner
idempotently and does not trigger sidecar recovery. A maintenance request that
has already been sent is not replayed automatically; readiness waiting does not
bypass manual recovery.

Current configuration UI and packaging validation is recorded in
[Embedding Preferences](workbench-ui.md#embedding-preferences). The seven-platform
sidecar and Host Bridge CLI, Windows ACP bridge and dev content package have
current freshness evidence. Earlier provider, repository and controlled HTTP
validation is retained in the
[archived change](../../openspec/changes/archive/2026-11-16-improve-synthesis-embedding-configuration/validation.md).
Live provider endpoints and the complete retrieval acceptance aggregate remain
unverified.
