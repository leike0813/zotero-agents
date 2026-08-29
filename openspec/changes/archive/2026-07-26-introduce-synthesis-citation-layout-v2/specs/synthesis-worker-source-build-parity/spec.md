## ADDED Requirements

### Requirement: Source and build parity SHALL inventory Layout v2

Worker source identity, binary smoke, runtime freshness, candidate provenance, and operation inventory SHALL include `citation_graph_layout.v2` and the pinned toolchain/dependency identity.

#### Scenario: Candidate smoke enumerates operations

- **WHEN** a native candidate is built and inspected
- **THEN** its closed operation inventory SHALL contain all fifteen production operations including layout v2
- **AND** no Node layout worker source identity SHALL remain.

#### Scenario: Toolchain or layout source changes

- **WHEN** the dated nightly, Cargo lock, layout crate source, operation mapping, or build inputs change
- **THEN** source/build fingerprints and candidate freshness SHALL change together.
