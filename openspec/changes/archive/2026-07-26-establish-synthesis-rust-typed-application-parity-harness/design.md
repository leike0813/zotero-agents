## Context

The Rust durable candidate currently owns a complete 51-table SQLite schema and a recoverable Topic canonical store. Those layers have real cross-language fixtures. Its `synthesis-application` crate, however, is a generic thirteen-kind state machine: it hashes arbitrary JSON, stores `application:<kind>` rows, invokes string-named compute/effect ports, and optionally promotes a canonical payload. That model does not implement the Node Workbench or Topic applications and its inventory cannot prove application parity.

Workbench and Topic are the smallest useful typed slice. Workbench exercises bounded repository reads and restart reconciliation without mutation. Topic exercises strict DTO rebuilding, compute, optimistic basis checks, canonical commit, projection/receipt follow-up, warnings, admission shutdown, and reopen behavior. Both already have stable Node implementations and Core 204/206 contracts.

The production plugin continues to own its database, canonical tree, client routing, and all public mutation APIs. This change operates only on identity-bound shadow roots and development fixtures.

## Goals / Non-Goals

**Goals:**

- Replace the generic Rust application façade with domain-typed Workbench and Topic owners.
- Preserve existing Workbench and canonical-inspect wire DTOs while keeping Topic mutation private.
- Reuse the Rust repository schema and canonical durability mechanisms through typed adapters.
- Execute the real Node and Rust applications against separate roots and compare exact observable state.
- Establish an application-parity pattern that later domain-cluster changes can reuse.
- Correct migration evidence so R8 remains blocked until all application families have typed parity.

**Non-Goals:**

- No public API, production route, schema, canonical format, owner, manifest, installer, or supervisor change.
- No migration of Citation, Reference, Tag, Concept, Topic Graph, Checkpoint, Bundle, WebDAV, or Debug/Maintenance applications.
- No remote Topic apply capability and no Node runtime fallback.
- No attempt to treat a cache or normalized report as a correctness source.

## Decisions

### 1. Replace the generic application state machine instead of wrapping it

`synthesis-application` becomes a module façade over `dto`, `ports`, `workbench`, and `topic`. `ApplicationKind`, `ApplicationCommand`, `Application::execute`, generic string compute/effect ports, `ApplicationState`, and `application:<kind>` writes are deleted. Keeping them behind typed wrappers would retain a false second domain model and allow future callers to bypass typed invariants.

### 2. Make repository ports bounded and persistence-only

The Rust repository exposes typed cache rows, full operation rows, Topic state, and Topic projection CRUD. Workbench owns fixed cache keys, readiness decisions, failed-operation suppression, bounds, ordering, and DTO projection. Topic owns lifecycle and commit decisions. SQL adapters only normalize rows, execute indexed bounded queries, and perform short transactions.

The schema and 51-table inventory remain byte-for-byte compatible. No migration or fallback table is introduced.

### 3. Use canonical promotion as Topic's only commit point

The typed canonical adapter exposes `read_current`, `promote`, and `receipt` over the existing journal/fsync/recovery store. Topic validates request shape, assets, existence, basis, and engine output before promotion. A failed pre-commit stage may update only its operation lifecycle; it cannot write Topic state, projection, or canonical current.

After promotion, current is authoritative. Projection and operation-receipt failures are returned as stable warnings and never roll current back. This matches the Node application contract and makes partial follow-up failure explicit.

### 4. Inject one typed Structured Artifact engine

Topic accepts a port whose request and response enums distinguish validation, full assembly, and patch assembly. The service candidate may bind the existing Rust engine adapter; the parity example binds deterministic fixture behavior. There is no string operation dispatch or generic JSON compute payload in the application crate.

### 5. Scope admission to active Topic applies

`stop_admission` rejects every new apply with a stable code. `shutdown` first stops admission and then waits within a caller-supplied bound for active applies to drain. List, detail, Workbench read, health, and existing canonical inspect remain bounded read paths. Active-count state is process-local and reconstructed closed/open on owner creation rather than persisted as domain state.

### 6. Build an independent application corpus and report

`synthesis-typed-application-parity-v1` is separate from the durable-foundation corpus. Each case fixes clock values, operation IDs, transaction IDs, inputs, engine outcomes, and fault points. A Node checker creates `node-oracle` and `rust-candidate` roots, runs the Node application directly, invokes a development-only Rust Cargo example, and compares reports.

Reports include public Workbench/Topic DTOs, stable codes and warnings, all 51 sorted table snapshots, canonical JSON/Markdown bytes and hashes, journal/receipt state, and close/reopen results. Only temporary roots and mutable owner identity are excluded. Content is not fuzzily normalized.

### 7. Keep candidate composition narrow

`ServeState` owns a typed Workbench application and the typed canonical owner used by `topics.canonical.inspect`. The two authenticated capabilities retain their exact request/result shapes and control-plane behavior. The typed Topic mutator is linked for library/harness use but is never registered as a service capability.

### 8. Treat parity as cumulative, explicit evidence

The durable corpus continues to govern schema, PRAGMA, transactions, canonical bytes, journal, and recovery. It no longer reports the thirteen-family inventory as application parity. This change accepts Workbench and Topic only. Three later domain-cluster changes must establish typed differential coverage for the remaining families before R7 application parity or R8 readiness can be claimed.

## Risks / Trade-offs

- [The full Node Topic composition has environment-specific adapters] → Bind only its existing environment-neutral application ports and use fixture-owned adapters; compare public DTOs and durable outputs, not private call order.
- [Fault injection can make parity reports platform-sensitive] → Use named logical phases, fixed fixture values, normalized slash-independent relative paths, and stable codes while preserving bytes.
- [A single large corpus becomes hard to review] → Keep cases grouped by Workbench, Topic behavior, faults, and lifecycle with strict schema/version validation.
- [Typed repository additions can accidentally absorb policy] → Restrict methods to row CRUD and caller-provided bounds; enforce Workbench decisions in `workbench.rs`.
- [Post-commit warnings can hide divergence] → Report warnings as ordered stable codes and compare current, projection, receipt, and operation rows independently.
- [Five-platform execution cost increases] → Run one focused typed checker after Rust workspace tests and before candidate smoke; do not dispatch a remote workflow in this change.

## Migration Plan

1. Add the Change contracts and failing Core/Rust parity tests.
2. Add typed repository and canonical adapters without schema changes.
3. Replace the generic Rust application with typed Workbench and Topic modules.
4. Recompose the candidate read canaries and preserve its handshake inventory.
5. Add corpus, Rust example, Node checker, restart/fault cases, and workflow gate.
6. Remove durable checker's application-inventory claim and correct migration documentation.
7. Run local strict OpenSpec, Rust, parity, Stage-1, TypeScript, lint, format, build, smoke, and package gates.

Rollback is a source revert before production cutover; no production state or data migration exists.

## Open Questions

None. Remaining application clusters and R8 lifecycle work are explicitly deferred to later Changes.
