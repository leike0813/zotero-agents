## ADDED Requirements

### Requirement: Rust SHALL own the five private deterministic operations
The native sidecar SHALL strictly rebuild and compute Tag Vocabulary validation/index, Concept KB index/query, and Topic Graph index through the existing Rust worker executable with no active Node compute branch or per-request fallback.

#### Scenario: Private deterministic operation runs
- **WHEN** a private sidecar application submits any of the five canonical operations
- **THEN** the shared pool SHALL execute it in Rust and strictly rebuild the result before application use
- **AND** no public HTTP capability or production plugin route SHALL be added.

### Requirement: Deterministic worker payloads SHALL be paged and atomic
The worker SHALL transfer operation-specific request and result sections as bounded canonical pages with descriptors, hashes, strict ordering, and one-page acknowledgement backpressure.

#### Scenario: Multi-page result completes
- **WHEN** Rust emits a valid result across multiple acknowledged pages
- **THEN** the service SHALL expose only the complete strictly rebuilt result after `result_complete`.

#### Scenario: Paged execution is corrupted or interrupted
- **WHEN** a page is oversized, out of order, duplicated, hash-invalid, wrong-task, malformed, canceled, timed out, or followed by worker failure
- **THEN** the attempt SHALL fail through the existing worker error mapping
- **AND** no partial result SHALL be exposed.

### Requirement: Cross-language deterministic semantics SHALL be explicit
TypeScript and Rust SHALL consume the same strict schemas and reviewed corpus for UTF-16 ordering, Unicode lowercasing, flagless ECMAScript regular-expression behavior, canonical bytes, hashes, versions, and domain results.

#### Scenario: Gold operation is computed in both languages
- **WHEN** a reviewed request is rebuilt and computed by the TypeScript oracle and Rust kernel
- **THEN** the rebuilt results, canonical JSON bytes, and SHA-256 SHALL be identical.

### Requirement: Native dependency and resource growth SHALL remain gated
The native workspace SHALL pin its toolchain, lockfile, direct/transitive dependency inventory, licenses, provenance, five-target support, compressed candidate size, five-second operation deadline, and 256-MiB peak-RSS target.

#### Scenario: Maximum collection-count profiles run
- **WHEN** each operation executes an independent canonical profile at its collection-count bounds with representative bounded strings
- **THEN** three consecutive runs SHALL each complete within five seconds and below 256 MiB peak worker RSS.

