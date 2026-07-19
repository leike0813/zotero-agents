## ADDED Requirements

### Requirement: Rust Metrics candidate SHALL consume the language-neutral contract

The native candidate SHALL strictly rebuild Metrics v2 requests and results, use the shared canonical ordering and JSON/hash semantics, and match the frozen TypeScript oracle for every accepted gold case.

#### Scenario: Gold request is computed
- **WHEN** the Rust engine consumes a reviewed Metrics request corpus case
- **THEN** its result DTO, canonical bytes, and SHA-256 SHALL equal the frozen oracle

#### Scenario: Invalid Metrics input is received
- **WHEN** input violates the existing node, edge, identifier, endpoint, number, or result-set constraints
- **THEN** Rust SHALL reject it without returning partial metrics or relaxing the v1 schema

### Requirement: Native Metrics work SHALL remain process isolated and bounded

The executable SHALL provide replaceable `worker` and candidate `serve` modes, cooperative checkpoint cancellation, deadline kill isolation, and deterministic framing without filesystem, database, canonical-root, Zotero, or subprocess authority inside the Metrics kernel.

#### Scenario: Worker hangs or crashes
- **WHEN** a worker exceeds the five-second deadline, ignores cancellation grace, exits, or emits an invalid frame
- **THEN** the owner SHALL terminate or replace it and expose the existing structured worker failure without a Node Metrics fallback

#### Scenario: Maximum valid request is measured
- **WHEN** the 5,000-node/20,000-edge boundary profile runs
- **THEN** peak worker RSS SHALL remain below 256 MiB and no partial result SHALL be published

### Requirement: Native candidate artifacts SHALL meet portability and size gates

The workspace SHALL build locked candidates for Windows x64, macOS x64/arm64, and Linux x64/arm64 with recorded source/toolchain/lock fingerprints, hashes, dependency licenses, smoke evidence, and compressed sizes.

#### Scenario: Five candidates are aggregated
- **WHEN** all target artifacts are produced
- **THEN** each compressed artifact SHALL be below 15 MiB and their total SHALL be below 75 MiB
