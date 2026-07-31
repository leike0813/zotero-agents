# synthesis-sidecar-citation-graph-application-foundation Specification

## Purpose
Defines the application-level foundation for the Synthesis sidecar citation graph component, including its service boundary, lifecycle, and integration with the sidecar runtime.

## Requirements

### Requirement: Citation Graph application contracts are strict and bounded

The application SHALL rebuild exact `inspect`, `readSlice`, `readMetrics`, `readLayout`, `rebuildFull`, `recomputeLayout`, `refreshMetrics`, `stopAdmission`, and `shutdown` inputs and outputs, SHALL reject unknown fields, and SHALL enforce the existing slice bounds plus a maximum metrics page size of 100.

#### Scenario: Invalid input is rejected before work begins
- **WHEN** a request contains an unknown field, unsupported direction, role, preset, scope, cursor, limit, or an out-of-bounds build input
- **THEN** the application returns `invalid_request` or rejects the read without repository mutation or worker admission

### Requirement: Inspection exposes bounded projection state

The application SHALL expose only the active graph hash, canonical input hash, metrics hash, node and edge counts, and layout/metrics readiness; it SHALL NOT expose graph payloads, database details, paths, or production identities.

#### Scenario: Empty and ready inspection remain constant-size
- **WHEN** a caller inspects an empty or populated shadow application
- **THEN** the result contains only strict state descriptors and bounded counts independent of graph size

### Requirement: Full rebuild uses canonical input identity and graph compare-and-swap

The application SHALL accept only a strict full-scope build-engine request, compute its canonical input hash, allow `expectedGraphHash:null` only when no active graph exists, require updates to match the active graph hash, and return `unchanged` for an identical input hash unless `force:true`.

#### Scenario: First creation requires null basis
- **WHEN** the repository has no active graph and a valid full rebuild declares `expectedGraphHash:null`
- **THEN** the application computes and transactionally promotes the graph structure and light metrics

#### Scenario: Update basis mismatch has zero graph writes
- **WHEN** the repository has an active graph and the request expected graph hash does not match it
- **THEN** the application returns `basis_mismatch` without worker execution or graph writes

#### Scenario: Identical input is unchanged unless forced
- **WHEN** a request has the active canonical input hash and `force:false`
- **THEN** the application returns `unchanged` without worker execution

### Requirement: Graph promotion is atomic and preserves last-good state

The repository SHALL validate the expected active basis and replace application state, nodes, edges, ownership, incoming indexes, and light metrics in one SQLite transaction. A build failure, invalid worker result, basis supersession, transaction failure, or pre-promotion receipt failure SHALL preserve the complete last-good graph.

#### Scenario: Transaction failure rolls back full replacement
- **WHEN** any graph replacement statement or commit fails
- **THEN** the previously active graph and all of its projections remain readable and mutually consistent

#### Scenario: Concurrent winner supersedes computed result
- **WHEN** the active graph hash changes after build computation but before promotion
- **THEN** the stale result is discarded as `basis_mismatch` and does not overwrite the winner

### Requirement: Source-slice promotion SHALL preserve unrelated graph rows

The repository SHALL compare-and-swap a source-slice result against the active
graph hash and atomically replace only the affected source outgoing edges,
ownership, incoming indexes, related nodes, and derived light metrics. It SHALL
derive the promoted graph hash from the complete merged projection.

#### Scenario: One source slice is promoted
- **GIVEN** the active graph contains source A and source B
- **WHEN** a basis-valid source-slice result for source A is promoted
- **THEN** source A rows are replaced and source B rows remain present
- **AND** complex metrics and layout become pending for the new complete graph hash

#### Scenario: Source-slice basis is superseded
- **WHEN** the active graph hash changes before the source-slice transaction begins
- **THEN** promotion returns `basis_mismatch`
- **AND** neither the winner nor any unrelated graph row is modified

### Requirement: Citation Graph reads SHALL capture a coherent durable basis

The native read adapter SHALL capture graph application state, graph rows,
light and complex metrics, layout state, cache basis, and topic scope metadata
under one repository ownership boundary before projecting any public response.

#### Scenario: A graph commit races with a read
- **WHEN** a read begins before or after an atomic graph promotion
- **THEN** its graph hash, rows, metrics, and layout are all derived from one side of the commit
- **AND** it never combines the old hash with newly promoted rows

#### Scenario: Cache refresh fails after a graph was previously readable
- **WHEN** cache basis or a new operation is stale or failed
- **THEN** diagnostics report that state while the last-good graph remains readable

### Requirement: Complex metrics follow graph commit semantics

After graph promotion, the application SHALL compute complex metrics through the worker and SHALL promote them only if the graph hash remains active. A metrics or terminal operation receipt failure after graph commit SHALL keep the graph committed and return success with a stable warning.

#### Scenario: Post-commit metrics failure does not roll back graph
- **WHEN** structure and light metrics commit but complex metrics computation or persistence fails
- **THEN** rebuild returns `promoted` with a stable warning while inspection exposes the committed graph and metrics not ready

#### Scenario: Superseded metrics are discarded
- **WHEN** a complex metrics result completes for a graph that is no longer active
- **THEN** the result is not promoted and the active graph metrics projection is unchanged

### Requirement: Layout recomputation is explicit and basis-bound

Full rebuild SHALL NOT automatically compute layout. `recomputeLayout` SHALL execute the existing layout engine for a strict preset and bounded scope and SHALL persist the result only while its graph hash remains active.

#### Scenario: Rebuild leaves layout pending
- **WHEN** a graph rebuild is promoted
- **THEN** layout readiness remains false until an explicit recomputation succeeds for the active graph

#### Scenario: Superseded layout is discarded
- **WHEN** layout computation completes after another graph becomes active
- **THEN** the stale layout is not persisted or returned for the active graph

### Requirement: Reads are stable, bounded, and projection-backed

Slice reads SHALL reuse existing depth, direction, role, node, and edge bounds; metrics reads SHALL use stable ordering and pagination with at most 100 records; layout reads SHALL select persisted coordinates by preset and bounded scope. No read SHALL invoke a graph kernel or require an in-memory full graph mirror.

#### Scenario: Stable pagination survives restart
- **WHEN** a caller pages metrics before and after reopening the same repository
- **THEN** record order, cursor progression, and bounded page contents remain identical

#### Scenario: Missing projection is explicit
- **WHEN** a caller requests metrics or layout that has not been promoted for the active graph
- **THEN** the bounded result reports not-ready without falling back to production data or on-demand main-process computation

### Requirement: Mutation admission is globally serialized

At most one Citation Graph mutation SHALL be active globally. A competing mutation SHALL immediately return `graph_application_busy`, while reads, health, handshake, stop admission, and shutdown remain responsive.

#### Scenario: Competing mutation fails fast
- **WHEN** a rebuild, metrics refresh, or layout recomputation is already active and another mutation arrives
- **THEN** the second request returns `graph_application_busy` without queueing or changing state

### Requirement: Compute remains worker-owned and bounded

Build, layout, and metrics kernels SHALL execute only through the existing global single-worker, two-item-queue compute service with its five-second deadline and fuse. Full rebuild SHALL enforce the existing 8 MiB request, 250,000 request-node, and 50,000 result-node admission limits and SHALL NOT automatically switch to packed or streaming transfer.

#### Scenario: Worker and admission failures are stable
- **WHEN** the worker is busy, times out, crashes, returns an invalid result, or the request exceeds monolithic admission
- **THEN** the mutation returns `worker_busy`, `worker_failed`, or `invalid_request` without main-process kernel execution or projection mutation

### Requirement: Lifecycle preserves repository ownership

The service SHALL construct the private Citation Graph application after isolated repository recovery. Shutdown SHALL stop mutation admission, cancel and await active compute, and then close the repository; persisted application state SHALL be reconstructed on restart or fail closed as `repair_required` when schema/state is corrupt.

#### Scenario: Shutdown rejects new mutation work
- **WHEN** shutdown has stopped admission
- **THEN** new mutations return `stopping`, active compute is canceled and awaited, and repository closure occurs afterward

#### Scenario: Restart preserves the active projection
- **WHEN** the service reopens a valid repository after a promoted graph
- **THEN** inspection and bounded reads expose the same hashes, counts, and persisted projections without rebuilding

### Requirement: Shadow composition remains private and production-disconnected

The service SHALL NOT advertise an HTTP/RPC graph capability, accept production paths, route `SynthesisClient` calls, invoke the shadow application automatically, or change production graph repositories, basis capture, layout/metrics worker routes, or promotion. Governance SHALL retain `mutationEnabled:false`, 108 public methods, one direct consumer, eight engine owners, and two production worker routes.

#### Scenario: Packaging does not imply production cutover
- **WHEN** the private application is built and included in the runtime bundle
- **THEN** public discovery and production ownership inventories remain unchanged while direct fixture composition can exercise the shadow application
