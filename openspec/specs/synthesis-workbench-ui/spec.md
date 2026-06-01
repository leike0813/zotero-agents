## Purpose

Synthesis Workbench presents sidecar cache state, explicit operations, and review queues.
## Requirements
### Requirement: Workbench presents cache state and explicit operations
Synthesis Workbench SHALL present sidecar cache status, explicit operation rows, and bounded review queues instead of background synchronization queues.

#### Scenario: Cache is stale
- **WHEN** reference or graph cache status is stale
- **THEN** Workbench SHALL label it as stale cache
- **AND** it SHALL offer an explicit refresh action without implying Zotero Library is stale.

### Requirement: Workbench reads do not start maintenance
Workbench snapshot reads SHALL NOT start cache refresh, startup reconcile, worker drain, or sidecar mutation.

#### Scenario: User opens Workbench
- **WHEN** Workbench builds the initial snapshot
- **THEN** it SHALL read current sidecar rows and direct source-check summaries only
- **AND** it SHALL NOT enqueue or start maintenance work.

### Requirement: Reference refresh progress uses real stage counts
Workbench SHALL present reference sidecar refresh progress from real stage counts or as indeterminate when totals are not known.

#### Scenario: Reference sidecar refresh runs
- **WHEN** refresh has discovered artifact scan or changed-reference totals
- **THEN** Workbench SHALL show determinate progress for scanned sources, changed artifacts, extracted raw references, canonical matches, or binding candidates
- **AND** it SHALL NOT display an invented percent for a long stage with unknown total.

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

