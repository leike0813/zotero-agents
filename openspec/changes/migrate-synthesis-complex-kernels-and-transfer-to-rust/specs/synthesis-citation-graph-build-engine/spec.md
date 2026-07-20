## ADDED Requirements

### Requirement: Private Citation Graph Build execution SHALL use Rust
Monolithic private graph build SHALL execute as `citation_graph_build.v1` through the shared Rust child while the TypeScript engine remains a plugin implementation and differential oracle.

#### Scenario: Graph canary builds a bounded graph
- **WHEN** a valid private graph request fits the monolithic wire envelope
- **THEN** the Rust result SHALL be canonically identical to the TypeScript oracle
- **AND** no Node graph-build compute branch SHALL run.

### Requirement: Graph result rebuilding SHALL validate invariants directly
Production rebuilding SHALL verify request identity, row kinds, complete reference identity, endpoint integrity, ownership, incoming groups, aggregate edges, light metrics, stable ordering, counts, and hashes without computing a second TypeScript graph.

#### Scenario: Structurally plausible graph is inconsistent
- **WHEN** output has a duplicate edge, dangling node, mismatched aggregate, ownership error, or incomplete reference set
- **THEN** the result SHALL be rejected before publication.
