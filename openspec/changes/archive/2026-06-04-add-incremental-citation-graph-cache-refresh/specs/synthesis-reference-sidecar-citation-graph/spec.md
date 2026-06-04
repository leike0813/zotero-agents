## ADDED Requirements

### Requirement: Citation Graph cache supports source-slice incremental refresh

Citation Graph cache SHALL support a bounded source-slice refresh that rewrites only affected source outgoing edges, source ownership, incoming groups, related nodes, and light metrics.

#### Scenario: Source slice is refreshed without replacing unrelated rows

- **GIVEN** an existing graph cache has edges from source A and source B
- **WHEN** the graph cache refresh receives only source A as affected
- **THEN** source A graph rows are rebuilt from current active sidecar facts
- **AND** source B graph rows remain present.

### Requirement: Sidecar-changing actions may trigger visible graph incremental refresh

Workflow apply, Reference Sidecar refresh, and Advanced Matching SHALL be allowed to trigger an explicit incremental graph refresh operation after their own sidecar or fact changes complete.

#### Scenario: Incremental graph refresh is a separate operation

- **WHEN** a sidecar-changing operation triggers graph refresh
- **THEN** Citation Graph refresh progress is represented by its own `synt_operation`
- **AND** failure of that graph refresh SHALL NOT roll back the completed sidecar-changing operation.

### Requirement: Graph bootstrap policy is operation-specific

Graph cache missing or failed state SHALL be handled according to the triggering operation.

#### Scenario: Workflow apply skips missing graph bootstrap

- **GIVEN** graph cache is missing or failed
- **WHEN** literature-digest workflow apply updates sidecar facts
- **THEN** it SHALL NOT run a full graph rebuild.

#### Scenario: Explicit heavy operations may bootstrap graph cache

- **GIVEN** graph cache is missing or failed
- **WHEN** Reference Sidecar refresh or Advanced Matching changes graph-affecting facts
- **THEN** it MAY run an explicit full graph rebuild operation.

### Requirement: Stale graph cache can be refreshed manually from recorded delta

When `citation-graph:library` is stale, Workbench SHALL be able to trigger a manual source-slice incremental refresh only from stale delta metadata recorded in cache-basis diagnostics.

#### Scenario: Manual stale refresh has recorded delta

- **GIVEN** graph cache basis is stale
- **AND** diagnostics record affected source refs or changed canonical/binding/redirect ids
- **WHEN** `refreshCitationGraphCacheIncrementalNow` runs
- **THEN** it SHALL refresh the affected graph source slices
- **AND** it SHALL NOT run full graph cache rebuild.

#### Scenario: Manual stale refresh has no recorded delta

- **GIVEN** graph cache basis is stale
- **AND** diagnostics do not record an incremental refresh scope
- **WHEN** Workbench renders graph controls
- **THEN** the manual incremental refresh action SHALL be unavailable
- **AND** full graph cache rebuild SHALL remain available as the fallback.
