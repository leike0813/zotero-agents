# synthesis-rust-citation-reference-application-parity Specification

## Purpose

Define independent Rust application and durable-state parity for Citation and Reference behavior.

## Requirements

### Requirement: Citation and Reference application parity SHALL use independent durable owners
The checker SHALL execute Citation Graph through its typed application entry point and Reference read, refresh, matching/review, and Canonical Reference mutation through the grouped Reference application interface. Node oracle and Rust candidate execution SHALL use distinct mutable roots and one immutable `synthesis-citation-reference-application-parity-v1` fixture.

#### Scenario: A cluster case is executed
- **WHEN** the checker executes a corpus case
- **THEN** neither implementation opens, derives, or mutates the other implementation's repository, canonical, journal, receipt, or owner path
- **AND** only fixture bytes are shared.

#### Scenario: Reference behavior is compared
- **WHEN** the corpus performs refresh, matching/review, or Canonical Reference mutation
- **THEN** the Rust candidate invokes the grouped Reference application interface with an explicit promotion checkpoint
- **AND** parity compares the compatible public result and close/reopen durable observations.

### Requirement: Cluster parity SHALL compare observable and durable state
For each deterministic scenario, the checker SHALL compare public DTOs, stable status and warning codes, stable table-specific projections from all 51 sorted table snapshots, cache and operation rows, and close/reopen observations. Table-specific normalization MAY omit an implementation-derived hash, identifier, or kernel detail only when its public result and referential invariant are compared separately. It SHALL additionally assert that canonical tree, journal, and receipt state were not modified by this cluster.

#### Scenario: A durable side effect differs
- **WHEN** a public result matches but a stable persisted field, reopen state, or protected untouched owner differs
- **THEN** the checker SHALL fail the scenario.

### Requirement: The private cluster SHALL preserve explicit downstream boundaries
The corpus SHALL include a refresh to matching/review to graph rebuild shared-fact scenario, but each application SHALL execute only when explicitly invoked by the fixture.

#### Scenario: Reference facts are promoted
- **WHEN** refresh or review changes graph-relevant reference facts
- **THEN** the result SHALL expose bounded staleness or delta facts
- **AND** no graph rebuild, Host effect, or public route is invoked automatically.
