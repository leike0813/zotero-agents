# synthesis-rust-typed-application-parity-harness Specification

## Purpose
Defines the typed application parity harness that executes independent Node and Rust owners against physically separate mutable roots while sharing only an immutable fixture, covering Workbench and Topic as the first typed reference slice.

## Requirements

### Requirement: Typed application parity SHALL execute independent Node and Rust owners

The checker SHALL execute the existing Node application and the typed Rust application against physically separate mutable roots while sharing only an immutable `synthesis-typed-application-parity-v1` fixture.

#### Scenario: Differential case starts
- **WHEN** one typed parity case is executed
- **THEN** the Node oracle and Rust candidate use distinct repository, canonical, staging, journal, receipt, and owner roots
- **AND** neither implementation opens or derives the other's mutable paths

### Requirement: The typed corpus SHALL be strict and deterministic

The corpus SHALL fix its version, clocks, operation IDs, transaction IDs, materialized assets, engine results, fault phases, bounds, and expected stable codes and SHALL reject unknown fields, missing fields, invalid limits, and unlisted cases.

#### Scenario: Fixture contains an uncontrolled input
- **WHEN** a fixture omits an identity-producing value or includes an unknown normalization directive
- **THEN** both harness boundaries reject the fixture before application execution

### Requirement: Workbench and Topic SHALL be the first typed reference slice

The corpus SHALL execute Workbench empty/populated/restart behavior and Topic list, detail, create, full update, patch update, conflict, validation, failure, lifecycle, and reopen behavior through typed application entry points.

#### Scenario: Reference slice inventory is audited
- **WHEN** typed parity governance enumerates the v1 cases
- **THEN** every Workbench and Topic behavior named by Core 204 and Core 206 has a success or stable-failure differential case
- **AND** no other application family is reported as covered

### Requirement: Parity reports SHALL compare shared observable state

Each implementation report SHALL contain public Workbench and Topic DTOs,
stable status/error/warning codes, deterministic snapshots of shared durable
tables, canonical bytes and hashes, journal and receipt state, and the same
observations after close/reopen. An implementation-private schema marker with no
owner in the other implementation SHALL be normalized by one shared parity
policy and verified by the owning implementation's repository tests instead.

#### Scenario: Rust carries a private redirect-graph schema marker
- **WHEN** the Rust report contains `reference_redirect_graph_schema_version`
- **THEN** the shared parity projection SHALL omit that Rust-owned row by key
- **AND** Node rows and unrelated Rust schema rows SHALL remain observable
- **AND** Rust repository tests SHALL continue to verify the exact current marker and migration

#### Scenario: One shared durable side effect differs
- **WHEN** DTOs, common table rows, canonical bytes, journal classification, receipt, or reopen behavior differs
- **THEN** the differential checker SHALL fail with a stable mismatch location

### Requirement: Reports SHALL carry immutable evidence identity

Reports SHALL record the corpus version and deterministic Node and Rust source fingerprints while excluding temporary paths, credentials, mutable owner identities, and platform-specific absolute locations.

#### Scenario: A parity report is reviewed
- **WHEN** a checker result is persisted or printed
- **THEN** the exact fixture and both source implementations are identifiable without exposing a live mutable root

### Requirement: The Rust parity driver SHALL remain development-only

The Rust driver SHALL be a Cargo example that reads one strict corpus request, uses its own root, and writes one strict report to stdout. It MUST NOT be linked into candidate capability dispatch or packaged runtime files.

#### Scenario: Runtime package is audited
- **WHEN** candidate source and XPI inventories are checked
- **THEN** no parity corpus, driver entry point, oracle adapter, or test-only fault controller is present

### Requirement: Typed parity SHALL gate all supported candidate targets

Linux x64, Linux arm64, macOS x64, macOS arm64, and Windows x64 workflows SHALL run Rust tests and the typed application differential before candidate smoke and package acceptance.

#### Scenario: One platform omits the typed differential
- **WHEN** the five-target workflow definition is audited
- **THEN** candidate acceptance fails unless every target runs the same corpus version and checker
