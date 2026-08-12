# Runtime and Cache Refresh

## Native Runtime and Migration Boundary

The supervised runtime is the Rust executable bundled with the installed XPI.
The strict manifest-v3 installer materializes one verified `current` directory.
There is no independent sidecar updater, version generation, admission,
cutover, activation, or runtime rollback.

Startup writes one launch-scoped config containing production database,
canonical, reverse Host, runtime identity, and session-token fields, then runs
`serve --config`. Rust holds `state/synthesis.lock` as an exclusive OS file
lock before opening production storage. Session discovery, authenticated health,
and authenticated handshake are sufficient to publish the native client.
Receipt, owner, lease, pointer, and activation files are not runtime inputs.

If the production database, SQLite sidecars, and canonical root are all absent,
Rust initializes the database and canonical root while holding the lock. A
partial combination fails with `synthesis_source_state_incomplete` without
constructing the missing half.

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
the accepted worker's execution bound. Their operation-specific controllers publish bounded progress and
exactly one success, failure, cancellation, or timeout terminal; callers poll
the read-only operation API and use the control extension for cancel, continue,
or retry. Reverse-Host calls keep their capability-specific bounds, including
the larger hash-guarded artifact-read path.

All normal Synthesis capabilities enter through the 96-operation native
production manifest: 95 routes reconciled to the fixed 131-method baseline plus
the approved `client.controlPublicMaintenanceOperation` extension. TypeScript
composition owns grouped-client validation, UI orchestration, large-content
staging/resolution, and reverse-Host adapters. Rust owns typed domain dispatch,
application behavior, repository transactions, canonical Topic files, and
workers. Zotero item objects, preferences, credentials, local delivery paths,
and raw Host errors never cross the public client contract. The retained
113-method service in TypeScript and the Node packages are differential-only
and cannot receive a production request.

The Stage 1 seam/oracle history is documented in
`artifact/synthesis_sidecar_service_stage1_refactor_plan_20260715.md`; the Rust
continuation is documented in
`artifact/synthesis_sidecar_rust_migration_plan_20260718.md` and the active
OpenSpec changes. `apps/synthesis-service` remains independently compilable for
differential tests, but production supervision accepts only verified
`rust-native` manifest identity and an absolute native executable.

The durable and application parity corpora fix repository foundation v2 at 53
tables and 46 indexes, together with SQLite PRAGMAs, canonical bytes/hashes,
fault points, public DTOs, stable codes, journal/receipt state, and reopen
behavior. The registered v1→v2 migration preserves Topic, approved
binding/redirect/review, operation, sync, and last-good projection facts while
marking rebuildable cache state stale. Production uses one serialized writer
and at most four read-only connections. Seven-platform candidate execution is
evidence only and does not publish or synchronize assets.

Plugin startup non-blockingly installs, launches, discovers, and supervises the
native production owner. Startup reconciliation runs after current-session
readiness. Restart, transport, deadline, worker, or identity failures do not
retry through Node or a plugin production owner.

Remote Topic Context and filtered paper-artifact delivery cross the bounded `SynthesisHostExportDeliveryPort`. The application builds canonical text entries; the production Host adapter owns temporary ZIP bytes, integrity metadata, opaque Host Bridge file registration, and cleanup. Port absence or malformed/unavailable receipts fail the remote request without a local-path fallback. Local output-path and ACP run-root writes are unchanged. The readonly composition does not inject remote export delivery.

Citation Graph layout computation crosses the environment-neutral `SynthesisCitationGraphLayoutEngine` seam. The application derives one deterministic default projection: active library nodes precede shared external nodes, each tier is ID-sorted, single-source supplemental external nodes are excluded, and retained edges are ID-sorted and endpoint-closed. It projects one full graph hash plus at most 20,000 nodes and 80,000 edges into canonical compute DTOs, awaits the authenticated sidecar worker without holding the library write lock, then reacquires a short lock and promotes only if the current DB graph hash still matches. Superseded or failed results preserve the previous layout content. The command returns its receipt within the ten-second control deadline; accepted layout work has a 120-second operation deadline and its paged worker phase has a 90-second deadline. The pool still has one active task and two waiting tasks. Complete UTF-8 request and response envelopes remain independently capped at 8 MiB; compute request JSON is capped at 1,000,000 structural nodes and compute response JSON at 200,000, with depth 32 and 64 KiB strings. These wire limits do not promise transport for every theoretical maximum-string DTO admitted by the engine count bounds. Oversized traffic fails without truncation, compression, persistence, retry, or in-process fallback. Request ID and service-instance identity are validated before strict result rebuilding and graph-basis promotion.

Citation Graph complex metrics cross the sibling
`SynthesisCitationGraphMetricsEngine` seam with independent 5,000-node and
20,000-edge bounds. The Rust application captures graph rows and persistence
mappings through bounded repository reads, executes PageRank/component/role
compute in the Rust worker without holding the writer, and rechecks the graph
hash before replacing complex metrics. Full rebuild, source-slice incremental
refresh, and explicit metrics refresh use this one path. A superseded or failed
result preserves previous metrics; graph structure remains readable while
metrics report stale or missing state.

Citation Graph structure construction crosses
`SynthesisCitationGraphBuildEngine`. The Rust application captures active raw
references, effective canonical ids, accepted bindings, and a durable-fact basis
through bounded repository reads, obtains required Zotero metadata through the
reverse-Host port, and computes outside the writer transaction. Full rebuild and
source-slice promotion recapture the same basis before replacing rows. Large
builds use authenticated canonical transfer pages and atomic attempt output;
the worker has no repository, canonical-file, Host, or staging-path authority.
Superseded, malformed, canceled, or oversized attempts preserve the last-good
graph. Input pages, output sinks, and adopted publications carry typed byte
reservations; moving ownership does not change the aggregate count, and
dropping the final owner releases it once. Idle reaping skips active attempts.
Absolute expiry, explicit cancel, and shutdown hide and cancel an active
session first, then remove its files only after the attempt returns.

Workbench Citation Graph reads are repository-backed windows. The first Graph
surface response contains at most 200 ranked primary nodes, 400 primary edges,
100 hover-only nodes, and 200 hover-only edges; the sidecar deterministically
shrinks a page when its serialized graph payload would exceed 768 KiB. Each
edge page is endpoint-closed. SQLite remains the source of graph structure,
counts, filters, and stable ordering; layout/topic helper data is read against
the selected graph basis and is only an optimization, never a correctness
source. A versioned opaque cursor binds the graph hash and normalized query
signature to the four repository offsets. A changed graph, filter, topic, or
layout basis fails with `basis_mismatch` instead of mixing pages.

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
- Topic Structured Artifact computation uses strict manifest validation, assembly, artifact validation, and section-patch operations. The Rust production application owns canonical serialization, hashing, promotion, repository metadata, and downstream coordination; Zotero and export file authority crosses bounded reverse-Host ports.
- Synthesis runtime packaging supports Windows x64, macOS x64/arm64, and Linux x86/x64/arm/arm64. Installation reads only packaged assets and writes only `runtime/synthesis/service-runtime`. The supervisor launches only the verified absolute product runtime with a sealed environment and never resolves system commands.
- Synthesis sidecar state is a cache projection unless it records a user-approved reference/binding/dedupe decision.
- Workbench snapshot reads must not create or drain background work.
- Service construction and ordinary progress, chrome, client, and debug reads must not reconcile or mutate operation lifecycle state.
- Explicit startup runtime reconciliation cancels every persisted `running` operation as a restart orphan and records `synthesis_operation_stale_after_restart`; elapsed time during a live process is not a cancellation signal.
- Workbench UI reads are surface-scoped: chrome/status, Index, Review, Graph, Tags, Concepts, and Topics are separate read models.
- Normal startup must not reconcile the whole Zotero Library into Synthesis.
- Long work must be user/debug-triggered, scoped, cancellable when practical, and visibly stale-tolerant.
- Dirty events, WorkItems, WorkRuns, startup reconcile, queue drain, Registry rebuild, and registry epochs are removed implementation targets.

## Normal Runtime Flow

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

| Operation | Trigger | Writes | Does Not Do |
| --- | --- | --- | --- |
| Artifact cache sync | digest/topic apply for one item/topic | selected artifact existence/hash projection rows | scan unrelated Zotero items or persist Zotero item metadata |
| Reference sidecar refresh | user/debug selects item/library scope | artifact sidecar scan/diff, changed raw-reference extraction, canonical-reference dedupe, safe best-effort binding, `reference-sidecar:library=ready`, and stale Citation Graph / related-items sync diagnostics with changed source scope | full library metadata projection, hidden graph refresh/rebuild, graph layout rebuild, related-items sync, or user approval decisions |
| Reference binding repair/review | user starts review flow | accepted/rejected binding, merge, dedupe, or retarget decisions | silently rewrite Zotero item metadata or run from ordinary refresh |
| Citation graph cache incremental refresh | user refreshes a stale graph, or Advanced Matching / proposal review changes graph-affecting sidecar facts | affected source-slice graph nodes, edges, incoming groups, source ownership, and light metrics; graph readiness is committed before shared complex-metrics compute | scan artifacts, extract references, run matcher, rebuild layout, or topic work |
| Citation graph cache rebuild | user opens Graph rebuild/debug command, or allowed bootstrap after Advanced Matching when graph cache is missing | graph nodes, edges, and light metrics from active raw references, effective canonical references, and bindings; graph readiness is committed before shared complex-metrics compute | scan artifacts, extract references, run binding review, rebuild layout, mark topics changed |
| Citation graph metrics refresh | full rebuild, incremental refresh, or explicit metrics command | metrics v2 rows promoted only when the current graph hash still matches the captured basis | rebuild graph structure, hold the write lock during CPU computation, or remove previous rows on failure |
| Citation graph layout rebuild | user opens layout/debug command | bounded engine coordinates for an existing graph hash and preset, promoted under a short hash-check lock | rebuild graph data, refresh reference sidecar, or activate a production worker |
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
| User opens a topic | Source check compares the topic source manifest with current bounded Host metadata/artifact reads for that topic. |
| User opens Graph | Graph view may show missing/stale/failed cache and offer citation graph cache rebuild. |
| Digest is applied | Only that item's artifact/reference sidecar projection is updated; Citation Graph and related-items sync are marked stale with source-scoped diagnostics. |
| Large Zotero changes happened outside Synthesis | UI/debug may recommend explicit reference sidecar refresh or binding repair. |
| Structural inconsistency is suspected | Fail closed for cache writes and ask for inspect/repair; do not generate per-item fan-out. |

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
