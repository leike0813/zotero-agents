## ADDED Requirements

### Requirement: Sealed graph transfers execute through a bounded packed worker
The service SHALL execute explicitly requested sealed Citation Graph Build transfers through the existing single-worker pool using strictly rebuilt transferable pages and a packed engine representation, without exposing service paths or assembling one monolithic transport DTO.

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
The worker SHALL emit deterministic output pages within the existing page byte and JSON-node limits, and the service SHALL expose them only after strict validation and atomic attempt commit.

#### Scenario: Attempt fails after partial output
- **WHEN** a timeout, cancellation, crash, invalid page, or sink failure occurs after pages were staged
- **THEN** no output SHALL be readable and the sealed input SHALL remain available for explicit retry unless the session itself was canceled
