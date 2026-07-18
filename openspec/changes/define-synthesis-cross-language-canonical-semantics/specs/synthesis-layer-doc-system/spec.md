## ADDED Requirements

### Requirement: Active documentation reports cross-language migration state precisely

Active Synthesis documentation SHALL identify the cross-language contract and canonical-semantics milestone as Rust migration R1, state whether a Rust executable exists, and name the next approved migration slice.

#### Scenario: R1 documentation is read after completion

- **WHEN** a maintainer consults the migration plan or Synthesis status documentation
- **THEN** it SHALL state that the v1 contract/corpus oracle is frozen
- **AND** no Rust executable or production ownership change exists
- **AND** the next change is the Citation Graph Metrics vertical slice.
