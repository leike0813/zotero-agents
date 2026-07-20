## ADDED Requirements

### Requirement: Private matcher execution SHALL use Rust
Private reference binding and canonical dedupe SHALL execute through the shared Rust pool while the environment-neutral TypeScript engine remains the plugin production implementation and differential-test oracle.

#### Scenario: Private matcher preparation runs
- **WHEN** the isolated matching application prepares binding and dedupe work
- **THEN** it SHALL invoke `reference_binding.v1` and `reference_canonical_dedupe.v1`
- **AND** it SHALL NOT instantiate an in-process or Node-worker matcher engine.

### Requirement: Matcher publication validation SHALL not rerun the algorithm
Production result rebuilders SHALL validate versions, request identity, row completeness, uniqueness, stable ordering, cluster/action consistency, candidate limits, reference integrity, counters, diagnostics, and policy invariants without recomputing matching decisions in TypeScript.

#### Scenario: Fabricated matcher result is returned
- **WHEN** a worker changes an identity, ordering, cluster representative, action, score boundary, counter, or diagnostic relation
- **THEN** the rebuilder SHALL reject the result before application promotion.

### Requirement: Matcher quality SHALL not regress
The reviewed reference-resolution fixture matrix SHALL preserve precision, recall, candidate recall, cluster/pair budgets, suggestion boundaries, and zero danger false positives for every accepted strategy profile.

#### Scenario: Differential report is generated
- **WHEN** the reviewed gold labels are evaluated against TypeScript and Rust
- **THEN** Rust metrics SHALL be no lower than the migration baseline
- **AND** danger false positives SHALL equal zero.
