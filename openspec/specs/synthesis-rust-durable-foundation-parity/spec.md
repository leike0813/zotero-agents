# synthesis-rust-durable-foundation-parity Specification

## Purpose
TBD - created by syncing change migrate-synthesis-durable-foundation-to-rust. Update Purpose after archive.

## Requirements

### Requirement: Rust durable foundation SHALL match the frozen Node oracle

The system SHALL implement the complete isolated Synthesis repository, Topic canonical store, and private application behavior in Rust and SHALL compare observable results with the frozen Node oracle from versioned language-neutral fixtures.

#### Scenario: Complete differential fixture passes
- **WHEN** the same immutable fixture and use-case sequence run against independent Node and Rust shadow profiles
- **THEN** normalized public DTOs, stable error codes, sorted durable table state, canonical bytes and hashes, and receipt state are equal

### Requirement: Differential owners SHALL be physically isolated

Node and Rust parity runs MUST use distinct temporary profile roots, databases, canonical roots, staging trees, journals, receipts, and writer leases. They MAY receive separate copies of the same read-only fixture.

#### Scenario: Oracle and candidate run concurrently
- **WHEN** a differential test executes Node and Rust for the same fixture
- **THEN** neither implementation can open, lock, mutate, recover, or derive the other implementation's mutable root

### Requirement: Rust applications SHALL depend only on explicit ports

The Rust application layer SHALL depend on strict repository, canonical-store, compute-worker, and bounded remote-effect ports. CPU kernels MUST use the injected worker port, and WebDAV MUST use an injected secret-free transport.

#### Scenario: Static dependency boundary is inspected
- **WHEN** crate dependencies and imports are audited
- **THEN** the application layer contains no SQLite adapter, credential source, generic HTTP client, production path resolver, Zotero binding, or Node fallback

### Requirement: Application parity SHALL cover every private durable use case

Final R7 application parity SHALL include Workbench, Topic, Citation Graph, Reference Refresh, Reference Matching/Review, Tag Vocabulary, Concept KB, Topic Graph, Knowledge Checkpoint, Durable Bundle export/import, WebDAV, and Debug/Maintenance behavior corresponding to the stable Core 203–217 fixture suites. Coverage SHALL be credited only when a real typed Node/Rust differential executes the family behavior and compares its public DTOs, stable failures, restart behavior, and durable state; an enum, name inventory, generic command executor, or synthetic application row SHALL NOT count as parity evidence.

#### Scenario: Application parity inventory is checked
- **WHEN** R7 acceptance evidence is reviewed after the Workbench and Topic reference slice
- **THEN** only Workbench and Topic are recorded as typed application parity complete
- **AND** the remaining families keep R7 application parity and R8 readiness incomplete

### Requirement: Five-target fault acceptance SHALL be mandatory

Linux x64, Linux arm64, macOS x64, macOS arm64, and Windows x64 candidate workflows SHALL execute repository lock/transaction tests, canonical journal crash/recovery tests, every completed typed application parity corpus, source/build fingerprint validation, and fifteen-operation native smoke.

#### Scenario: One target misses a durability gate
- **WHEN** any target omits or fails a required repository, canonical, typed parity, fingerprint, or smoke check
- **THEN** R7 candidate acceptance fails

### Requirement: R7 SHALL remain shadow-only

Production `SynthesisClient`, production repository and canonical owners, public capability routing, and legacy composition SHALL remain unchanged. Rust SHALL expose no runtime fallback to Node and no mutation-enabled service surface.

#### Scenario: Production ownership is audited
- **WHEN** client imports, service capability inventory, and candidate handshake are inspected
- **THEN** production routes do not reference the Rust canaries and the candidate reports `mutationEnabled: false`
