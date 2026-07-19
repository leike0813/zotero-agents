## MODIFIED Requirements

### Requirement: Sealed graph transfers execute through a bounded packed worker
The service SHALL execute explicitly requested sealed Citation Graph Build transfers through the existing single-worker pool using one canonical page-frame carrier shared by the service and worker, strictly rebuilt transferable pages, and a packed engine representation, without exposing service paths or assembling one monolithic transport DTO.

#### Scenario: Normal transfer completes through real HTTP and worker
- **WHEN** an authenticated client seals and executes the normal 2,000-source/100,000-reference profile
- **THEN** the worker SHALL complete within its resource limit and publish paged output semantically identical to the direct engine

#### Scenario: Worker has no external authority
- **WHEN** the packed operation runs
- **THEN** the worker SHALL NOT access filesystem paths, databases, canonical files, Host capabilities, Zotero globals, or child processes

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
