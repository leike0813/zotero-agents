## MODIFIED Requirements

### Requirement: Runtime affinity SHALL be expressed by file placement

Tests SHALL be placed under the runner whose environment their assertions require.

#### Scenario: Deterministic test

- **WHEN** a test can prove behavior through a public module interface, parseable artifact, mock, or fake DOM
- **THEN** it is placed in a Node-owned production-domain directory

#### Scenario: Real-host test

- **WHEN** a test requires real Zotero API, SQLite, XPCOM, window/Reader, host filesystem, subprocess, or nested host-page behavior
- **THEN** it is placed directly in a Zotero `lite` or `full` directory

### Requirement: Zotero lite SHALL be a critical host guard

Zotero `lite` SHALL contain stable critical behavior that requires the real host.

#### Scenario: Lite admission

- **WHEN** a real-host test is stable, non-interactive, and protects a critical host integration risk
- **THEN** it is eligible for `test:lite`
- **AND** Node-only logic matrices are not duplicated there

#### Scenario: Full admission

- **WHEN** a real-host regression is stable but long-running, optional-process-dependent, or lower frequency
- **THEN** it is placed in `full`

### Requirement: Mixed runtime tests SHALL be split

Tests with materially different Node and Zotero behavior SHALL be split by runtime owner.

#### Scenario: Runtime-dependent case selection

- **WHEN** a test file uses runtime or mode checks to select materially different cases
- **THEN** its Node and Zotero behavior is separated into files owned by their runners
- **AND** routine Zotero membership is not selected by test title

### Requirement: Routine Zotero tests SHALL avoid unstable interaction classes

Routine Zotero tests SHALL exclude unstable interactive behavior without a dedicated harness.

#### Scenario: Interactive host UI

- **WHEN** a test can open a real editor, picker, dialog, installer, publication network flow, or brittle multi-realm override
- **THEN** it remains outside routine `lite` and `full` execution unless a dedicated stable harness exists

### Requirement: Real Zotero tests SHALL clean shared state

Real Zotero tests SHALL clean shared host state after execution.

#### Scenario: Test teardown

- **WHEN** a real Zotero case finishes
- **THEN** shared teardown records failure context before cleanup
- **AND** it stops and drains background work
- **AND** it removes tracked Zotero objects in dependency order

### Requirement: Test governance SHALL target stable behavior

Tests SHALL assert stable observable behavior or consumer-visible artifacts.

#### Scenario: Toxic assertion

- **WHEN** a test only asserts source strings, instruction prose, internal call order, exact incidental UI text, or suite configuration text
- **THEN** it is removed or replaced by an existing check or observable behavior test

#### Scenario: Allowed artifact contract

- **WHEN** a static read parses a public schema, wire corpus, release manifest, checksum, executable bit, or package inventory
- **THEN** it may remain as a consumer-visible contract test

### Requirement: Test governance SHALL NOT require meta-tests

Test-suite governance SHALL NOT add tests whose only subject is test membership or policy.

#### Scenario: Governance validation

- **WHEN** the test suite itself is reorganized or pruned
- **THEN** validation uses inventory listing and actual runner execution
- **AND** no test is added solely to test tests, allowlists, titles, or directory policy
