## MODIFIED Requirements

### Requirement: Sidecar-changing actions defer graph refresh

Workflow apply and Reference Sidecar refresh SHALL mark Citation Graph cache stale with bounded delta metadata instead of automatically running Citation Graph refresh.

#### Scenario: Digest apply defers graph refresh

- **WHEN** literature-digest workflow apply updates sidecar facts for one source
- **THEN** `citation-graph:library` SHALL be marked stale with that source ref
- **AND** the apply path SHALL NOT run graph incremental refresh
- **AND** it SHALL NOT bootstrap a missing graph cache.

#### Scenario: Reference Sidecar refresh defers graph refresh

- **WHEN** Reference Sidecar refresh changes references artifact state for source refs
- **THEN** `citation-graph:library` SHALL be marked stale with changed source refs and binding canonical ids
- **AND** Reference Sidecar refresh SHALL NOT run graph incremental refresh or full graph bootstrap.

### Requirement: Manual stale graph refresh runs scoped follow-up sync

Manual Citation Graph stale refresh SHALL consume recorded stale delta metadata, refresh affected graph source slices, and then run related-items sync scoped to the final affected source refs.

#### Scenario: Manual stale refresh succeeds

- **GIVEN** `citation-graph:library` is stale with delta diagnostics
- **WHEN** `refreshCitationGraphCacheIncrementalNow` succeeds
- **THEN** graph rows and complex metrics SHALL be refreshed for the affected source refs
- **AND** related-items sync SHALL run only for the final affected source refs.

#### Scenario: Manual stale refresh fails

- **GIVEN** `citation-graph:library` is stale with delta diagnostics
- **WHEN** `refreshCitationGraphCacheIncrementalNow` fails
- **THEN** the graph cache SHALL remain stale or failed with diagnostics
- **AND** related-items sync SHALL NOT run.

### Requirement: Full graph rebuild does not force full related-items sync

Full Citation Graph rebuild SHALL NOT automatically run full-library related-items sync.

#### Scenario: Graph cache rebuild succeeds

- **WHEN** `rebuildCitationGraphCacheNow` completes
- **THEN** graph cache and metrics MAY become ready
- **AND** full-library related-items sync SHALL remain an explicit/debug operation unless a scoped stale related-items delta is available.
