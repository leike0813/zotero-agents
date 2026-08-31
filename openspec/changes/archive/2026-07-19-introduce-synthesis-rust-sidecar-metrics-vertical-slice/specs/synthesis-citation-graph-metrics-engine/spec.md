## MODIFIED Requirements

### Requirement: Metrics kernels SHALL preserve metrics v2 behavior

The active engine SHALL implement Metrics v2 in Rust with the existing weighted PageRank, weak components, year normalization, foundation/frontier scoring, role hints, constants, one-millionth rounding, explicit UTF-16 ordering, and deterministic result structure. The TypeScript implementation SHALL remain only as a frozen differential oracle.

#### Scenario: Existing graph is computed through Rust
- **WHEN** a canonical request is computed by the active engine
- **THEN** its strict result and application-projected canonical metrics hash SHALL match the reviewed Node oracle

#### Scenario: Node worker sources are inspected
- **WHEN** the vertical slice is accepted
- **THEN** no active Node worker Metrics operation, branch, or runtime fallback SHALL remain
