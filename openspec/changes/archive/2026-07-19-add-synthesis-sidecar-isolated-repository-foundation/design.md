## Context

The plugin currently owns the production Synthesis SQLite repository, canonical files, legacy migration, and all production engine composition. The sidecar main process owns authenticated control and supervised workers but receives only opaque runtime/data-root identities, not production paths. WS5 needs a real persistence slice before repository parity or cutover can be credible, while preserving that isolation.

The existing plugin repository contains the foundation table facts and CRUD together with every other table family and a Zotero-specific adapter. Copying those facts into the service would immediately create schema and DTO drift. Conversely, moving the entire repository would grant the service responsibilities that this change is explicitly not ready to assume.

## Goals / Non-Goals

**Goals:**

- Establish one environment-neutral source of truth for the foundation SQL contract and three table families.
- Exercise a real service-main-process SQLite database, persistent restart behavior, transactions, recovery, shutdown, bundle, and fingerprint paths.
- Keep the database under a deterministic, private, per-profile shadow root derived only from existing opaque runtime identities.
- Fail before readiness if identity or schema safety cannot be established.
- Keep authenticated health and handshake useful and constant-time without exposing filesystem or SQL details.

**Non-Goals:**

- Reading, migrating, mirroring, or mutating the production Synthesis database or canonical files.
- Routing any public `SynthesisClient`, Workbench, engine, or workflow operation through the repository.
- Extracting the remaining repository table families or completing shadow parity and single-writer cutover.
- Adding dependencies, a public storage capability, UI, preferences, operation persistence APIs, or release prebuilds.

## Decisions

### Share a narrow environment-neutral foundation package

`packages/synthesis-repository` owns SQL primitives, the adapter interface, foundation DTOs, strict row rebuilding, schema version identity, the three foundation tables and indexes, and their CRUD/reconciliation functions. It imports neither Zotero nor Node modules. The plugin repository imports these facts and continues to own its full-schema version, Zotero adapter, legacy migration, memory adapter, and all non-foundation tables.

This incremental extraction is preferred over copying DTO/DDL into the service or moving the full repository because it produces an enforceable SSOT without broadening service authority.

### Use Node's built-in synchronous SQLite API behind one adapter

The designated main-process adapter uses `node:sqlite` `DatabaseSync` from the pinned Node 24 runtime. Synchronous calls are acceptable for this bounded three-table foundation because transactions remain short and no domain workload is routed here. The adapter owns parameter normalization, strict row conversion, nested savepoints, WAL configuration, rollback, and close. No worker or shared package may import `node:sqlite`.

This avoids a new native dependency and exercises the runtime that is actually packaged. A worker-owned database was rejected because lifecycle and ownership belong to the service main process; a plugin bridge was rejected because it would not prove isolation.

### Persist beneath the profile runtime root, never a supplied database path

The database lives at `<profileRuntimeRoot>/shadow-repository/<dataRootId>/synthesis.db`. The directory and database are owner-only on POSIX. A strict adjacent identity marker binds the profile identity, opaque data-root identity, repository schema identity, and an opaque repository ID. The service does not accept an arbitrary repository path and never receives the production database path.

Persistence is intentional: restart reconciliation is part of the canary. Shutdown does not delete the shadow root.

### Initialize before readiness and fail closed

Repository creation, marker validation, schema establishment, and running-operation reconciliation complete before the HTTP listener is published to discovery. Marker mismatch, unsupported schema identity, malformed rows required for reconciliation, or migration failure closes the handle and aborts startup. Consequently the public snapshot has only `ready` and `stopping`; there is no misleading degraded-ready repository state.

On startup, only persisted `running` operations become `canceled`; terminal operations and cache-basis rows remain. This mirrors existing repository semantics while avoiding domain execution.

### Keep lifecycle and observability bounded

Health and handshake return the same strict O(1) repository snapshot: mode `isolated_shadow`, state `ready|stopping`, the fixed foundation schema version, and an opaque repository ID. Paths, SQL, row counts, and production identities are excluded. Shutdown first stops request acceptance, then drains/terminates workers and transfer tasks, closes SQLite, and remains within the existing 500 ms service budget.

`mutationEnabled: false` continues to describe production mutation authority. Internal shadow writes do not change the public capability contract.

### Treat packaging and governance as part of the boundary

The TypeScript build emits the shared package and Node adapter. Bundle manifest, fingerprint, XPI inspection, boundary checks, and license verification include them. Fingerprints cover package sources, schema identity, service owner/adapter, package metadata, dependency versions, and lockfile. No third-party license is added because `node:sqlite` is supplied by the pinned Node runtime.

The service migration inventory remains 108 methods and one direct consumer; all eight engines keep their current production owners and only the existing two workers remain production-routed.

## Risks / Trade-offs

- [Synchronous SQLite can block the control plane if future workloads expand] → Keep the slice to bounded metadata CRUD and prohibit domain routing; require a later design before adding table families or heavy queries.
- [Shared SQL abstractions can grow into a lowest-common-denominator layer] → Extract only stable foundation facts and retain environment adapters at their owners.
- [Persistent shadow data can outlive incompatible code] → Bind it to a strict schema/identity marker and fail closed rather than guessing or resetting silently.
- [Node SQLite API behavior can drift] → Pin the runtime, test the real API, and include runtime/package/lockfile inputs in fingerprints.
- [A shadow database may be mistaken for production authority] → Keep naming, health mode, inventory, docs, and `mutationEnabled: false` explicit; expose no public repository capability.

## Migration Plan

1. Add and validate the shared foundation package while the plugin repository delegates only the extracted table facts and CRUD.
2. Add the Node adapter and isolated repository owner with real SQLite contract tests.
3. Initialize the owner before service readiness and add strict health/handshake reconstruction.
4. Extend packaging, fingerprint, boundary, governance, and documentation checks.
5. Ship only source changes; the normal release process regenerates prebuilds later.

Rollback removes the service owner and bundle inputs while the plugin remains the complete production repository owner. Shadow files are inert and can be removed only by an explicit later maintenance flow; rollback never touches production data.

## Open Questions

None for this change. Extracting further table families, running WS6 parity, and performing WS7 atomic single-writer cutover each require a separate change and explicit production ownership decision.
