# Runtime and Cache Refresh

The production Synthesis application and data authority remain inside the
Zotero plugin, while two pure kernels now cross the supervised
mutation-disabled Node service: Citation Graph layout and metrics. The default
production composition routes both through the same bounded authenticated
worker; graph reads, basis checks, promotion, canonical files, and the other six
engines remain plugin-owned. Compute request and response envelopes are each
capped at 8 MiB; general and system calls retain the 1 MiB request cap. The
active domain runtime model remains explicit, bounded cache maintenance rather
than automatic library-wide synchronization.

Workflow Topic option queries, startup runtime reconciliation, protected database reset, default-client invalidation, related-items notifier echo classification, Workflow Host synthesis operations, both production and read-only Workbench reads, Topic Report export, progress polling, Citation Graph, Reference, Concept, Topic, Topic Graph, Tag, WebDAV Sync commands, and all Host Bridge Synthesis capabilities enter through grouped `SynthesisClient` capabilities. Both Workbench paths keep chrome and surfaces separate and do not use the legacy full snapshot. Sync commands use `client.sync.webDav`; every command invalidates the cached client and legacy default service before acquiring fresh composition. Production composition injects the strict, secret-free `SynthesisHostWebDavSyncPort`; the WebDAV adapter alone reads current prefs/credentials, resolves remote URLs, and invokes the default HTTP client. Missing and readonly bindings are explicitly disabled and never fall back to prefs, fetch, or credentials. Ordinary Host Bridge and debug calls use the cached default client, whose legacy ports resolve the current default service per invocation. MCP derives its tool definitions and handlers from the Host Bridge catalog and passes local delivery mode; remote Host Bridge Topic Context and filtered artifact export carry remote delivery mode outside ordinary request JSON. Persisted operation progress remains the side-effect-free 500 ms `workbench.readProgress()` poll, and Sync commands preserve their chrome refresh fast path. Strict canonical DTOs and opaque JSON-safe results keep UI callbacks and domain internals outside client contracts. Production Workbench phased prewarm remains plugin-side orchestration over chrome and ordered surface reads. The Workflow Host exposes twelve use-case methods, snapshots live Zotero items, and materializes Topic assets before invoking the client. Reverse library and artifact reads use the bounded, JSON-safe `SynthesisHostReadPort`; artifact refresh compares payload-free descriptors before requesting a single hash-guarded payload. Topic digest representative images use the independent `SynthesisHostRepresentativeImageReadPort`, which resolves note-child image attachments into a bounded canonical DTO without exposing note HTML or local paths. Related Items mutations cross `SynthesisHostRelatedItemsEffectPort`. Staged Tag parent identities cross `SynthesisHostStagedTagBindingMigrationPort` only while legacy numeric rows exist, then persist as stable refs; bound-parent Tag writes cross `SynthesisHostTagEffectPort` as semantic ensure-present effects and receipts. Zotero item objects and raw Host errors remain in production adapters. Topic mirror runtime is retired: no service method, codec, recovery planner, UI state, or Zotero adapter reads or writes legacy anchor/shard items. The legacy composition root owns the grouped read adapters, representative-image adapter, Related Items effect adapter, staged Tag migration adapter, Tag effect adapter, WebDAV runtime adapter, default service instance, and invalidation. The readonly harness injects grouped library/artifact read capability plus explicitly disabled WebDAV runtime and omits representative-image file reads, binding migration, and Host writes. These boundaries remain in-process, so they do not change process, database, canonical file, or Zotero ownership. The legacy composition root is the only production direct consumer of the complete 108-method service.

The approved Stage 1 sidecar direction is documented in `artifact/synthesis_sidecar_service_stage1_refactor_plan_20260715.md` and the active Synthesis migration OpenSpec changes. The repository now contains an independently compiled Node service foundation under `apps/synthesis-service`: it provides only loopback liveness, authenticated protocol/profile/schema handshake, separate lifecycle-token shutdown, bounded request parsing, and redacted lifecycle diagnostics. Five platform bundles combine that service tree with product-owned Node `24.18.0`; strict manifests, signed upstream provenance, per-file hashes, staged installation, atomic active/previous pointers, repair, and rollback produce trusted absolute runtime paths.

Plugin startup non-blockingly installs, launches, discovers, and supervises the
mutation-disabled service. The default `SynthesisClient` still resolves the
legacy plugin composition, but that composition injects the sidecar-backed layout
and metrics engines. Each compute call uses the current ready connection; absence
fails immediately with `service_not_ready`, and restart, transport, deadline,
worker, or identity failures are not retried or executed locally. The plugin
remains the only owner of `synthesis.db` and Topic canonical files. Runtime
supervision is event-driven with one low-frequency deadline scheduler.

Remote Topic Context and filtered paper-artifact delivery cross the bounded `SynthesisHostExportDeliveryPort`. The application builds canonical text entries; the production Host adapter owns temporary ZIP bytes, integrity metadata, opaque Host Bridge file registration, and cleanup. Port absence or malformed/unavailable receipts fail the remote request without a local-path fallback. Local output-path and ACP run-root writes are unchanged. The readonly composition does not inject remote export delivery.

Citation Graph layout computation crosses the environment-neutral `SynthesisCitationGraphLayoutEngine` seam. The application projects one graph hash plus at most 5,000 nodes and 20,000 edges into canonical compute DTOs, awaits the authenticated sidecar worker without holding the library write lock, then reacquires a short lock and promotes only if the current DB graph hash still matches. Superseded or failed results preserve the previous layout content. The worker has a five-second hard deadline, one active task, and two waiting tasks. Its complete UTF-8 request and response envelopes are independently capped at 8 MiB; request JSON is capped at 250,000 structural nodes and response JSON at 50,000, with depth 32 and 64 KiB strings. These wire limits do not promise transport for every theoretical maximum-string DTO admitted by the engine count bounds. Oversized traffic fails without truncation, compression, persistence, retry, or in-process fallback. Request ID and service-instance identity are validated before strict result rebuilding and plugin-owned graph-basis promotion.

Citation Graph complex metrics cross the sibling `SynthesisCitationGraphMetricsEngine` seam with the same graph bounds. The application captures graph rows and persistence mappings under a short lock, sends the strict DTO through the authenticated sidecar worker outside the lock, then rechecks the DB graph hash before replacing complex metrics. Full rebuild, source-slice incremental refresh, and explicit metrics refresh use this one path. A superseded or failed result preserves previous metrics; graph structure and its ready cache basis remain readable while metrics report their existing stale or missing state. Canonical metrics hashing remains in the application adapter. Metrics shares the layout worker's one active slot, two waiting slots, five-second deadline, cancellation, replacement, and degraded fuse without retry or local fallback.

Citation Graph structure construction crosses `SynthesisCitationGraphBuildEngine`. The application captures active raw references, effective canonical ids, accepted bindings, and a durable-fact basis under a short lock; it then reads Zotero metadata and computes nodes, resolved and aggregate edges, source ownership, incoming groups, and light metrics outside the lock. Full rebuild and source-slice promotion recapture the same durable basis before replacing rows. Superseded, throwing, malformed, cancelled, or oversized builds preserve the last-good graph. Related-items fallback consumes the same engine result without promoting graph rows. Production limits are 25,000 source nodes, 1,250,000 reference instances, and 750,000 external targets; the authenticated Node worker remains an internal canary rather than a production route.

The explicit sidecar benchmark can execute synthetic graph builds while
separating request rebuild/serialization, direct compute, strict result
rebuild, structured-clone worker round trip, authenticated HTTP admission,
CPU/memory, event-loop responsiveness, and cancellation. Its
2,000-source/20,000-reference boundary already exceeds the request JSON-node and
both response limits; the normal tier also times out in the worker because
complete result validation recomputes the canonical graph. This evidence is a
prerequisite for a later bounded transfer contract, not a reason to raise
limits or route production traffic.

Concept KB search, overlay, and bounded exact label/alias queries cross
`SynthesisConceptKbIndexEngine`. The application reads and sorts SQLite-owned
concept, sense, and alias rows, supplies the current manifest basis for index
construction, and strictly rebuilds the asynchronous result before projection
promotion or public DTO assembly. Relations, review items, proposal
merge/create/review, manifests, diagnostics, and mutations stay application
owned. Failed, cancelled, malformed, or oversized computation preserves the
last projection registry state and durable rows. Production remains in-process;
the Node worker is test-only.

The full data-boundary decision is in [Library SSOT and Sidecar Cache](./library-ssot-and-sidecar-cache.md).

## Runtime Principles

- Zotero Library metadata is paged or resolved by stable ref through the Host read port when correctness matters.
- Source artifact scans return descriptors only; content is read one opaque locator at a time with the scanned hash.
- Representative-image enrichment is opt-in and best-effort. It reads only a requested digest note, requires a note-child image attachment, limits decoded content to 2 MiB, and never makes digest markdown availability depend on the image result.
- Remote export delivery accepts at most 256 text entries, 5 MiB per entry, and 50 MiB total; archive paths are relative and unique, and no local temporary path crosses the Host port.
- Citation Graph layout compute accepts at most 5,000 nodes and 20,000 edges, never holds the library write lock during kernel execution, and requires a matching graph hash at promotion.
- Citation Graph metrics compute uses the same limits, never holds the library write lock during PageRank/component/role computation, and replaces rows only for the captured graph hash.
- Citation Graph build compute accepts at most 25,000 source nodes, 1,250,000 reference instances, and 750,000 external targets, keeps Host reads and assembly outside the write lock, and replaces rows only for the captured durable sidecar-fact basis.
- Advanced Reference Matching uses one bounded engine with separate binding and canonical-dedupe contracts. It captures repository facts under a short lock, computes both passes outside the lock, recaptures Host and repository basis, and atomically promotes accepted facts and proposals only when the basis remains current.
- Tag Vocabulary validation and index construction use one strict synchronous engine capped at 25,000 entries, 50,000 aliases, 10,000 abbreviations, and 256 facets. Canonical mutation validation remains inside the existing repository transaction; index failure or malformed output cannot advance projection registry state.
- Concept KB index and query computation uses one strict asynchronous engine capped at 25,000 concepts, 100,000 senses, 250,000 aliases, 256 aliases per concept, 100 query labels, and 4,096 code units per string. Projection promotion remains application-owned; proposal matching is not part of the engine.
- Topic Graph index computation uses one strict asynchronous engine capped at 25,000 nodes, 100,000 edges, and 4,096 code units per string. It derives only roots and unplaced identifiers; graph/review rows, proposal and mutation logic, diagnostics, progress, and projection promotion remain application-owned.
- Topic Structured Artifact computation uses one strict asynchronous engine with separate manifest validation, artifact assembly, artifact validation, and section-patch methods. JSON depth, arrays, object properties, nodes, strings, and aggregate content are bounded; checkpoints observe composition invalidation. Workspace IO, digest availability, canonical hashing and promotion, downstream sidecars, discovery, and autosync remain application-owned. Production remains in-process and inside the existing canonical-write serialization; the Node service executes only the production layout and metrics kernels.
- Synthesis runtime packaging supports exactly Windows x64, macOS x64/arm64, and Linux x64/arm64. Installation reads only packaged assets and writes only `runtime/synthesis/service-runtime`. The supervisor launches only the verified absolute product runtime with a sealed environment and never resolves system commands.
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

Startup may do repository health checks, cancel persisted `running` operation rows that cannot belong to the new process, and perform phased Workbench read-model warmup. It must not reconcile sidecar cache, enqueue work, replay old operations, or start refresh. Warmup is not a maintenance operation: it may read bounded surface state, fill in-memory UI cache, and yield between phases, but it must not write domain cache rows.

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

Legacy Topic mirror items are inert historical data. Normal runtime does not discover, validate, rebuild, recover from, update, or delete them; any future one-shot import requires a separate explicit change.

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
