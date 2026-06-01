## ADDED Requirements

### Requirement: Workbench separates graph data rebuild from layout rebuild
Workbench SHALL present Citation Graph cache rebuild and Citation Graph layout rebuild as separate operations.

#### Scenario: Graph cache is missing or stale
- **WHEN** Graph tab has no ready graph cache basis
- **THEN** the primary action SHALL run `rebuildCitationGraphCacheNow`
- **AND** it SHALL NOT run `manualRecomputeLayout`.

#### Scenario: Graph cache is ready but layout is missing
- **WHEN** graph data exists but layout coordinates are missing or dirty
- **THEN** the primary action MAY run `manualRecomputeLayout`
- **AND** it SHALL NOT imply graph data refresh.

### Requirement: Workbench background jobs come from explicit operations
Workbench SHALL show Reference Sidecar and Citation Graph cache jobs from active or recent failed operation rows only.

#### Scenario: Sidecar cache is ready after previous failure
- **WHEN** a previous failed operation row or legacy state file exists
- **AND** the cache basis is ready after a later successful refresh
- **THEN** Workbench SHALL NOT show a failed `Reference sidecar refresh` background job.

### Requirement: Index exposes only minimal sidecar states
Workbench Index SHALL expose artifact coverage and reference binding state without legacy Registry readiness or reference-resolution filters.

#### Scenario: Index filters are rendered
- **WHEN** the Index page is rendered
- **THEN** filters SHALL include scope, artifact coverage, missing artifact, and binding status
- **AND** filters SHALL NOT include legacy `literature_status`, `readiness`, or `resolution_status` states.
