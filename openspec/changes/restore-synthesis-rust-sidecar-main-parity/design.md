## Context

The current branch diverges from the fixed native Synthesis baseline at `main@e210997a11e0054a3cb4ae0656e5cfb96102a09c`. That baseline exposes 131 service methods. The Rust production manifest exposes 96 operations: 95 audited baseline routes plus the approved `client.controlPublicMaintenanceOperation` wire-only extension. Thirty-nine baseline methods have no explicit production disposition.

The present migration evidence is insufficient. Seven surface corpora enumerate cases but mostly use small fixtures, the 10k performance suite still constructs the TypeScript in-process service, and the real Rust production-route test invokes only a subset of operations. Meanwhile the production compatibility dispatcher contains wrong side effects, placeholder projections, synchronous full-library work, and response/request policies that make valid payloads unreachable.

The worktree already contains uncommitted repairs for reverse-Host framing, literature apply, matching, and staged Tags. Those edits are user-owned input to this change and must be preserved, reviewed against the fixed baseline, and accepted only after the new gates pass.

## Goals / Non-Goals

**Goals:**

- Restore observable native-service behavior through the Rust production route.
- Give every one of the 131 baseline methods an explicit migrated, merged, Host-owned, or approved-retired disposition; retirement is limited to the 23-method authorization recorded in the migration SSOT.
- Keep ordinary DTOs bounded and move large content through existing transfer, locator, and delivery facilities.
- Restore operation receipts, progress, cancellation, retry, and unambiguous terminals for long work.
- Eliminate route-local business rules, N+1 reads, per-batch full-state scans, and fake success projections.
- Preserve durable user facts through forward migration while allowing rebuildable caches to become stale.
- Make real Rust production-route behavior and 10k/25k scale evidence prerequisites for acceptance and retirement.

**Non-Goals:**

- Reintroducing plugin or Node production fallback.
- Deleting retained plugin/Node oracle code.
- Publishing, prebuilding, releasing, signing, or synchronizing Gitee.
- Reproducing private implementation shape when observable behavior can be implemented more simply.
- Adding a general background queue, new transfer protocol, or third-party repository pool dependency.

## Decisions

### 1. Fix one executable functional baseline

`main@e210997a11e0054a3cb4ae0656e5cfb96102a09c` is the functional oracle. Its service/repository/library adapter and stable tests outrank migration documents when they disagree. Current Rust lifecycle, authentication, bounded Host authority, and single-owner rules remain mandatory unless they conflict only with obsolete lifecycle artifacts.

The existing `service-api-migration.yaml` becomes the sole 131-method audit map. Each entry records the baseline method, consumer, disposition, Rust operation, Host owner, or approved retirement, stable inputs/results, facts/effects, work model, size strategy, budget, and evidence IDs. No separate ownership JSON is added. The approved retirement set is closed: twelve Git Sync methods, three legacy Topic mirror methods, seven legacy public checkpoint/JSON methods, and `syncRelatedItemsNow`. Internal knowledge checkpoints, durable bundles, and WebDAV mechanisms remain in scope.

The 96-operation manifest remains the wire SSOT. The audit map explains how baseline behavior reaches the 95 baseline routes and records the single approved operation-control extension; it does not replace runtime metadata or alter the 131-method baseline audit.

### 2. Derive evidence from behavior, not roster presence

Existing surface corpora gain baseline source identity and concrete, normalized cases. Deterministic baseline runs use sanitized fixtures and normalize timestamps, paths, operation IDs, and other incidental fields. Rust evidence compares public DTO semantics, logical SQLite facts, canonical hashes, Host effects, idempotency, rollback, last-good preservation, and read-only zero-write behavior.

Inventory/source-string assertions remain only where they protect a closed boundary. A listed handler or serializable result is not readiness evidence.

### 3. Replace the compatibility dispatcher with typed domain adapters

`runtime_production_client` continues to authenticate, apply manifest policy, dispatch, and map stable errors. Domain adapters own request/result reconstruction only. Application services own behavior and transaction boundaries; repository modules own SQL; reverse-Host ports own Zotero/WebDAV/effect calls.

Route-local fallback parsing is forbidden. An invalid public DTO fails before side effects. A route without a real projection returns a stable unavailable result until implemented rather than a fabricated success-shaped object.

The monolithic compatibility module is deleted only after all operations have typed owners and the route matrix passes.

### 4. Keep the grouped API semantic while changing internal data movement

Ordinary metadata/page responses target 768 KiB and retain a 1 MiB hard limit. The general limit is not raised to accommodate 5-50 MiB Topic or artifact bodies.

The TypeScript native composition keeps public grouped-client inputs/results stable where practical. Large Topic assets are staged through the existing sidecar transfer facility and represented on the control plane by descriptors and hashes. Artifact, review, and export content uses existing locator/transfer/delivery paths. Complete-array public methods may drain internal pages with cursor-progress and aggregate bounds.

Alternative: raise all JSON limits. Rejected because it multiplies serialization, memory, lock duration, and timeout risk.

Alternative: add a second client streaming protocol. Rejected because the repository already has authenticated transfer and delivery concepts.

### 5. Long work returns the existing public operation receipt

Full-library and worker-backed mutations return the existing `SynthesisPublicMaintenanceOperation` receipt promptly. This applies to Reference refresh/matching; Citation rebuild, incremental refresh, metrics, and layout; Tag/Concept/Topic Graph rebuild; and WebDAV sync. Existing consumers observe progress through `getPublicMaintenanceOperation` and issue explicit cancel, continue, or retry mutations through `controlPublicMaintenanceOperation`.

The Host invocation audit classifies that receipt by maintenance lifecycle state rather than by the business result nested in its eventual terminal receipt. `pending` and `running` mean that the command was accepted, while `completed` is an already-successful terminal. Failure, cancellation, timeout, missing, malformed, or unknown receipt states are non-success. Domain statuses such as `promoted`, `unchanged`, `basis_mismatch`, and worker failures belong to the durable operation terminal and MUST NOT be applied to the initial acceptance envelope.

Execution uses operation-specific controlled loops and durable checkpoints. It does not add claimable work items, a daemon queue, or automatic startup draining. Deadline and cancellation checks occur between bounded phases and before promotion. A timed-out or canceled caller cannot receive an ambiguous failure after an unreported commit.

### 6. Restore bounded data access before algorithm tuning

Reference refresh captures Host item/artifact identity once, computes changed sources, and performs keyed batches. A batch cannot reload all sources, artifacts, raw references, or bindings. The final sweep uses source identities, not full content.

Topic list uses compact joined pages and loads detail/projection only on demand. Graph pages, topic scopes, metrics, and layouts use targeted queries. Tag effects use batches of at most 100. Artifact reads use at most two ordered concurrent Host calls.

The repository owns one serialized writer and up to four read-only connections, built without a new dependency. Long computation and Host/file IO occur outside write transactions.

### 7. Preserve durable facts and invalidate caches through registered migration

Repository foundation v2 adds `synt_topic_deleted_artifact`, keyed by Topic and ordered by deletion time, while Topic application identity advances to v2. Its registered v1→v2 migration preserves Topic state, user-approved binding/redirect/review decisions, operations, sync state, and last-good projections. It marks cache bases, Citation layout and complex metrics, Tag/Concept/Topic Graph indexes, and Reference/Matching readiness stale without deleting their last-good content. Production creates or verifies a content-addressed v1 backup before the immediate migration transaction; both version metadata rows are updated last. Reopen, repeat startup, and injected failure tests cover idempotency and rollback.

### 8. Repair by vertical slice

The order is Workbench/Topic/Workflow, Reference/Matching, Citation, Tags/Concepts/Topic Graph, then durable/WebDAV/maintenance/debug. Each slice starts with failing fixed-baseline and real-process tests and finishes only when its DTO, facts/effects, error, idempotency, and scale evidence pass.

### 9. Separate receipt admission from accepted-work execution

The production operation manifest owns two different bounds. `deadlineMs` and its overrides bound only the HTTP control plane, including creation of a public maintenance receipt. Every `public-maintenance-operation` capability also has an explicit `workDeadlineMs`; this persisted bound controls accepted work and retry/continue execution. Advanced Reference matching uses a 30-minute work deadline. Citation Graph layout uses a 120-second work deadline and a 90-second worker phase deadline. Reference binding and canonical dedupe worker phases use 15 minutes. Other receipt operations keep explicit operation-specific work bounds in the same manifest rather than inheriting the control deadline.

The same manifest rule that identifies successful domain values classifies the durable terminal. Receipt admission still uses only `pending`, `running`, or `completed`; after admission, a status such as `worker_failed`, `basis_mismatch`, a timeout, or an unsuccessful WebDAV queue state produces a failed, canceled, or timed-out operation row and never a completed row. The raw stable code remains in the durable receipt and terminal observation.

An accepted maintenance operation emits accepted/running/terminal observation events carrying its public operation ID and capability. Its originating trace remains active after the Host RPC root returns and becomes inactive only at the durable terminal. Polling traces cannot evict that active trace. Workbench failure reporting includes the public operation ID and the first stable diagnostic code so a user-visible failure can be correlated with the retained trace.

### 10. Keep layout facts separate from algorithm inputs and classify worker panics at the parent boundary

Citation self-loops remain valid durable graph facts and continue contributing to the canonical graph hash. Before choosing any layout algorithm, the layout crate validates the complete request and removes only self-loops from the in-memory edge set used for coordinates. This gives Force, Radial, and Components one shared rule and avoids changing repository, projection, or hash semantics.

The worker parent owns crash classification because release workers use aborting panics and cannot rely on `catch_unwind`. It captures only a bounded stderr tail, consumes it internally after the child closes, and maps identifiable Rust panic evidence to `worker_panicked`; other unexpected exits remain `worker_crashed`. No raw stderr becomes part of the public failure contract.

### 11. Carry export content through the existing authenticated transfer plane

Artifact export keeps projection, entry ordering, and manifest construction in Rust, but it does not place entry text in a reverse-Host JSON request. Rust serializes the validated export entries into the existing authenticated output-transfer facility and sends the reverse Host only a bounded, hash-bound transfer descriptor together with the local `runRoot` or remote `displayName`. The plugin drains the output transfer through the ready sidecar connection, verifies its session identity, target, byte length, and SHA-256 digest, rebuilds the strict export entry DTO, and only then invokes the existing local-workspace or remote-archive delivery port.

The reverse-Host request-body limit remains 1 MiB. Export delivery uses its existing 50 MiB aggregate and 5 MiB per-entry limits, while transfer pages retain their existing bound. Rust cancels the transfer session after every terminal delivery outcome, including reverse-Host rejection or timeout. Local workspace materialization validates the complete request before filesystem mutation and writes `manifest.json` last, so a rejected or incomplete transfer cannot leave a success-shaped export.

Alternative: increase the reverse-Host JSON limit. Rejected because reverse Host is a bounded control plane shared by unrelated capabilities, and raising it would duplicate large content in request parsing and validation.

Alternative: add an export-only streaming protocol. Rejected because the authenticated sidecar transfer facility already provides bounded pages, session scoping, integrity metadata, and cleanup semantics.

### 12. Keep Topic readiness and Topic Graph projections application-owned

The Topic aggregate keeps its compact state row and stores dependency readiness in its existing projection record rather than creating a second Topic entity. The readiness projection records the saved/current paper sets, required source-artifact availability, baseline/current hashes, structured reasons, and scan timestamps. Status and percentage are derived from those facts. Existing foundation-v2 databases receive a registered forward migration; rows whose historical baseline cannot be reconstructed remain explicitly dirty or missing until the next successful Topic apply establishes a baseline.

Topic apply persists its owned aggregate first, then asks `TopicGraphApplication` to materialize the current Topic and ingest controlled relation proposals. Topic Graph failure remains a warned partial projection failure, matching Concept projection semantics. The Topics Workbench projection composes its artifact page with the bounded canonical Topic Graph projection required by Graph view; Home does not load Topic Graph content it does not render. Workbench reads remain read-only and do not initialize or mutate readiness state.

Alternative: synthesize readiness defaults in the Workbench adapter. Rejected because it would preserve the false-green DTO while losing dependency history.

Alternative: derive Topics Graph from each Topic's `topic_graph_json`. Rejected because it would create a second graph fact source and bypass Topic Graph review and relation rules.

### 13. Keep Review facts domain-owned and publish one Workbench DTO

Reference, Concept, and Topic Graph applications remain the sole owners of their proposal, review, binding, redirect, concept, and relation facts. The Workbench Review surface composes those facts into the existing public `registry`, `concepts`, and `topicGraph` DTOs and uses `reviews` only for aggregate summary state. The production adapter must not expose a parallel `reviews.reference`, `reviews.concept`, or `reviews.topicGraph` content model.

Review queries apply the existing status, kind, confidence, search, cursor, and limit request before repository materialization. Reference projections include only the canonical rows and target candidates required by the visible proposal page; Concept and Topic Graph projections include only the candidate concepts or endpoint nodes required by their visible review rows. Aggregate counts use repository count queries rather than draining full review collections.

Short review mutations return the fixed baseline's structured singular diagnostic for missing, closed, invalid-target, stale-basis, busy, stopping, repair-required, and other non-commit outcomes. TypeScript retains the shared `failOnDiagnostic` consumer instead of learning domain status enums. Successful Concept and Topic Graph decisions mark their rebuildable indexes stale without starting a rebuild; Reference fact changes similarly mark Graph and Related Items stale.

Reference review idempotency is scoped to a concrete transition. A completed receipt may be reused only while the current monotonic matching/repository basis equals the receipt's committed after-basis. Reopen, retarget, reverse, reject, or any other intervening transition advances that basis, so a later identical action executes a new transaction rather than replaying an obsolete receipt. The receipt keeps its transition bases in existing receipt metadata and requires no schema migration.

Low-confidence Topic Graph review approval remains two-stage: approval creates a suggested edge, and a later edge decision confirms it. Confirmed `broader_than` changes refresh the existing Topic discovery projection; a downstream projection failure is reported without rolling back the committed relation.

Alternative: teach the UI to consume both the erroneous nested Review payload and the public domain DTOs. Rejected because it would create two wire contracts and preserve the projection drift.

### 14. Share one Citation Graph projection and isolate runtime observability

The repository owns one basis-bound Citation Graph projection. It counts external incoming degree by distinct library source, admits only degree-greater-than-one external nodes to the default graph, and publishes degree-one neighbors separately for ephemeral hover. Public pagination and layout consume the same bounded, endpoint-closed projection; filters may only shrink it.

Workbench reducers omit cleared optional properties and the native adapter rebuilds an explicit JSON-safe state DTO. The shared strict JSON validator remains unchanged. Layout uses its declared 90-second direct worker phase inside the existing 120-second maintenance budget. Detached work converts panics, deadlines, cancellation, and terminalization failures into observable terminals without promoting partial output.

Runtime status is a transient top-bar projection composed from the supervisor lifecycle and the bounded health response. It contains no paths, credentials, logs, or repository payloads. Foreground observation is coalesced and stops with the Workbench runtime; compute-pool degradation enters the existing bounded recovery policy only after the worker pool has exhausted its own replacement budget.

## Risks / Trade-offs

- [The fixed baseline contains behavior later judged undesirable] → Preserve it unless an explicit spec and user-approved disposition changes that behavior; do not silently reinterpret it during migration.
- [Public receipt returns affect consumers] → Reuse the existing operation DTO and update all TypeScript consumers in the same slice; keep no dual sync/async branch.
- [Large transfer support leaks filesystem authority] → Transfer descriptors remain authenticated, instance-scoped, hash-bound, size-bound, and opaque to callers.
- [Repository concurrency creates writer/read races] → Keep one writer, read through WAL-compatible read-only connections, and use basis/CAS checks before promotion.
- [Timing tests are noisy] → Keep query/Host-call/byte bounds as deterministic CI gates and run p50/p95 latency/RSS on the governed benchmark runner against the same fixed baseline.
- [Existing uncommitted repairs overlap] → Rebase behavior logically, never reset files, and preserve a repair only when the new differential test accepts it.

## Migration Plan

1. Record the fixed baseline and 131-method dispositions; mark R9b retirement blocked.
2. Extend existing corpora and tests with baseline-derived failing evidence.
3. Close known harmful and placeholder routes.
4. Introduce operation-specific wire/receipt policies and typed domain adapters.
5. Repair the five vertical slices in dependency order.
6. Apply registered forward migration and invalidate only rebuildable caches.
7. Run local contract, TypeScript, Rust, production-route, scale, and production-build gates.
8. Run representative Zotero 7/9 real-machine checks. Only then may retirement planning resume.

Rollback before data migration is source rollback. After migration, rollback restores the pre-migration database/canonical backup or uses a compatible forward repair; it never starts a legacy production owner.

## Open Questions

None. Baseline authority, the exact 23-method retirement list, remaining capability dispositions, wire policy, work model, scale tiers, data preservation, and retirement block are approved.
