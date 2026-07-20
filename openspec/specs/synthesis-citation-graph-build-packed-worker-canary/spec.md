# synthesis-citation-graph-build-packed-worker-canary Specification

## Purpose
Defines the synthesis citation graph build packed worker canary capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.
## Requirements
### Requirement: Sealed graph transfers execute through a bounded packed worker
The service SHALL execute explicitly requested sealed Citation Graph Build transfers through the existing single-worker pool using one canonical page-frame carrier shared by the service and worker, strictly rebuilt transferable pages, and a packed engine representation, without exposing service paths or assembling one monolithic transport DTO.

#### Scenario: Normal transfer completes through real HTTP and worker
- **WHEN** an authenticated client seals and executes the normal 2,000-source/100,000-reference profile
- **THEN** the worker SHALL complete within its resource limit and publish paged output semantically identical to the direct engine

#### Scenario: Worker has no external authority
- **WHEN** the packed operation runs
- **THEN** the worker SHALL NOT access filesystem paths, databases, canonical files, Host capabilities, Zotero globals, or child processes

### Requirement: Packed and direct adapters share graph semantics

The direct object adapter and streaming worker adapter SHALL use one graph-build semantic kernel and preserve the existing request, result, bounds, ordering, and diagnostics contracts.

#### Scenario: Adapter parity
- **WHEN** the same valid full or source-slice input is computed through both adapters
- **THEN** their canonical results SHALL be identical

### Requirement: Worker output is bounded and atomic
The worker SHALL emit deterministic canonical page frames within the existing page byte and JSON-node limits, and the transfer execution owner SHALL be the only boundary that strictly validates and atomically stages each frame before exposing output after attempt commit.

#### Scenario: Attempt fails after partial output
- **WHEN** a timeout, cancellation, crash, invalid page, or sink failure occurs after frames were staged
- **THEN** no output SHALL be readable and the sealed input SHALL remain available for explicit retry unless the session itself was canceled

#### Scenario: Output frame is acknowledged
- **WHEN** the worker emits a valid output frame for the active attempt
- **THEN** the service SHALL acknowledge that frame only after the owner has strictly validated and atomically staged it

#### Scenario: External transfer contract remains stable
- **WHEN** a client uses the Citation Graph Build transfer HTTP lifecycle
- **THEN** its request DTOs, result DTOs, canonical bytes and hashes, error codes, session states, deadline, and resource limits SHALL remain unchanged

### Requirement: Packed graph execution SHALL use the Rust child

Both bounded packed graph canary and staged graph transfer SHALL execute through the same `synthesis-citation-graph-build` Rust kernel, with direct and streaming adapters sharing domain semantics.

#### Scenario: Direct and transfer adapters are compared

- **WHEN** the same bounded graph request runs through monolithic and transfer adapters
- **THEN** canonical result rows, page bytes, hashes, lengths, ordering, diagnostics, and graph facts SHALL be identical.

### Requirement: Node graph-build worker code SHALL be retired

The private Node graph-build worker, packed carrier, and test-only graph fixtures SHALL be removed after Rust differential, fault, resource, and transfer-atomicity gates pass.

#### Scenario: Service bundle is inspected

- **WHEN** emitted Node worker sources and runtime imports are enumerated
- **THEN** no Citation Graph Build compute kernel or packed transfer implementation SHALL remain.
