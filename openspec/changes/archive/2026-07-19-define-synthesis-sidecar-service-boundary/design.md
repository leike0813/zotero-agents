## Context

`createSynthesisService()` is the composition root and public surface for a large in-process runtime. It currently returns 126 methods and directly or indirectly serves Workbench, workflows, Host Bridge, MCP, lifecycle hooks, item observation, persistence, canonical files, sync, and compute. Moving that object directly behind HTTP would preserve the coupling, create unbounded data transfer, and make DB/file ownership impossible to reason about.

The approved Stage 1 plan therefore uses a sequence of independently verified changes. This change establishes the governing boundary and current baseline only. Production execution remains in-process and the plugin remains the only production Synthesis DB/file owner until the explicit cutover change.

## Goals / Non-Goals

**Goals:**

- Give every current public service method and production consumer an auditable migration disposition.
- Define dependency, ownership, protocol, host-effect, compute, lifecycle, and cutover constraints that later changes must satisfy.
- Make the current invariant suite and representative migration fixtures reproducible.
- Correct documentation ambiguity without describing future runtime behavior as current state.
- Provide stable requirement and invariant names for later executable enforcement.

**Non-Goals:**

- Add contracts packages, clients, host ports, a Node process, worker threads, or HTTP/SSE.
- Change production `synthesis.db`, canonical Topic files, Zotero mirrors, or repository ownership.
- Migrate Workbench, workflow, Host Bridge, MCP, hooks, or observer consumers.
- Add an in-process fallback policy for the final architecture.
- Introduce Rust or change Synthesis algorithms.

## Decisions

### 1. The boundary change is governance, not a premature runtime claim

The new capability specifies constraints on the migration and cutover. Active documentation will explicitly distinguish current in-process behavior from the approved sidecar direction. Existing behavior specs are not modified until their implementation changes.

Alternative: update all active specs to the final architecture now. Rejected because active specs and docs must remain current-state only.

### 2. One inventory is the migration SSOT

`doc/synthesis-layer/contracts/service-api-migration.yaml` will contain every method returned by `createSynthesisService()`, its category, direct production consumers, target capability, and disposition. A TypeScript-based guard will parse the service return object and fail on missing or stale inventory entries. The inventory is migration metadata; runtime code must not import it.

Alternative: maintain separate lists in design documents and tasks. Rejected because they drift and cannot detect newly added direct consumers.

### 3. Baselines use text fixtures

Migration fixtures will use SQL/JSON/YAML/text representations rather than a checked-in binary SQLite database. They cover schema identity, canonical Topic tree shape, and bounded representative DTOs. This keeps review deterministic and allows all tracked edits to use normal patch-based workflows.

### 4. Ownership switches once

Before cutover, the plugin is the sole production owner. Shadow service work must use isolated roots and must not perform Zotero writes. At cutover, the plugin closes its repository before the service obtains the owner lock. After mutation is enabled remotely, automatic in-process fallback is forbidden.

### 5. Contracts are grouped use cases, not remote service methods

Later public contracts are grouped into system, Workbench, operations, workflow apply, topics, references, graph, knowledge, sync, maintenance, and debug capabilities. Lists are cursor-bounded. Files cross the boundary through controlled locators or streams, not absolute paths. Stable error codes and structured fields are control-flow truth; messages are diagnostic only.

### 6. Zotero access is a reverse capability boundary

The service must not read Zotero SQLite or import plugin modules. Bounded reads and semantic writes go through Host Capability ports. Host writes require preconditions, permission context, idempotent effect identity, and receipts, and never run inside a service SQLite write transaction.

### 7. Control and compute are separate owners

The Node main process owns protocol, operations, short DB transactions, canonical commits, and Host effect orchestration. CPU-heavy kernels run in a bounded worker pool. Workers cannot open production DB/files or call Host Capability APIs.

### 8. Product-owned runtime and selected platform matrix

The release will pin Node 24.18.0 and use `node:sqlite`. Runtime artifacts are verified and launched by controlled absolute path without PATH or shell lookup. Stage 1 sidecar support is limited to Windows x64, macOS x64/arm64, and Linux x64/arm64. Unsupported platforms expose a stable unavailable state while non-Synthesis plugin features continue.

## Risks / Trade-offs

- **Inventory extraction can misidentify dynamically composed methods** → Parse the concrete return object and validate the inventory against both method names and known direct-consumer searches; fail closed on ambiguity.
- **Static guards can lock implementation details** → Guard only architectural imports, direct consumer growth, ownership constructors, and unbounded boundary shapes; behavioral tests remain the primary evidence.
- **Future requirements can drift from current docs** → Keep target-state detail in this change and the Stage 1 plan; update active docs only as each implementation change lands.
- **Ten changes can expose temporary adapters** → Each adapter has an explicit removal change and is allowed only at composition boundaries.
- **Pinned runtime or release-candidate SQLite APIs can regress** → Later runtime/persistence changes must pass migration, crash, lock, integrity, and cross-platform gates before cutover.

## Migration Plan

1. Complete this boundary/baseline change.
2. Introduce contracts/client seam and migrate all consumers.
3. Introduce Host Capability ports.
4. Extract the pure engine.
5. Add the isolated Node runtime and worker pool.
6. Port application, repository, and canonical file ownership to isolated service fixtures.
7. Run parity, shadow, lifecycle, and performance gates.
8. Perform the single production ownership cutover.
9. Delete the plugin implementation and migration adapters.
10. Complete runtime publication and operational gates.

Rollback before cutover is removal or disablement of isolated work. Rollback after cutover requires stopping the service, releasing the owner lock, and restoring a verified backup; the plugin never writes while service ownership is uncertain.

## Open Questions

None. Change count, workspace/build approach, Node/SQLite choice, platform matrix, transport direction, and single-writer policy are confirmed.
