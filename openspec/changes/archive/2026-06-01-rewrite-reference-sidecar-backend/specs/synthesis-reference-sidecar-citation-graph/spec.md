## ADDED Requirements

### Requirement: Citation graph cache refresh is explicit
Citation Graph cache SHALL be rebuilt only by an explicit graph cache rebuild operation or equivalent scoped debug command.

#### Scenario: Reference sidecar refresh changes references
- **WHEN** Reference Sidecar refresh inserts, stales, canonicalizes, or binds references
- **THEN** Citation Graph cache SHALL be marked stale
- **AND** Citation Graph cache rows SHALL NOT be rebuilt in the same operation.

#### Scenario: Graph cache rebuild runs
- **WHEN** `rebuildCitationGraphCacheNow` runs
- **THEN** it SHALL derive graph nodes, edges, and lightweight metrics from active raw references, effective canonical references, and accepted reference bindings
- **AND** it SHALL mark `citation-graph:library` ready on success.

### Requirement: Reference binding status is minimal
Reference binding state SHALL use `unbound`, `candidate`, `accepted`, `rejected`, and `stale_target` as the only Index-facing states.

#### Scenario: Legacy accepted bindings are read
- **WHEN** existing binding rows contain previous `auto` or `confirmed` values
- **THEN** active Index and graph code SHALL normalize them to `accepted`
- **AND** automatic or user-confirmed provenance SHALL be represented as evidence, not as separate states.

### Requirement: Full Registry projection APIs are absent from active paths
Active Reference Sidecar and Citation Graph cache paths SHALL NOT depend on full Registry projection APIs.

#### Scenario: Sidecar main path executes
- **WHEN** Reference Sidecar refresh, Workbench snapshot, Index data source, Graph cache rebuild, or MCP cache diagnostics execute
- **THEN** they SHALL NOT call legacy Registry projection refresh, full-index replacement, or old registry fact listing APIs.
