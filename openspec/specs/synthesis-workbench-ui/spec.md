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

#### Scenario: Graph cache is missing
- **WHEN** Graph tab has missing graph cache basis
- **THEN** the primary action SHALL run `rebuildCitationGraphCacheNow`
- **AND** it SHALL NOT run `manualRecomputeLayout`.

#### Scenario: Stale graph rows remain usable
- **WHEN** Graph tab has a stale graph cache basis
- **AND** cached graph rows are still available
- **THEN** Workbench SHALL render the latest usable graph with a cache diagnostic
- **AND** it SHALL offer `refreshCitationGraphCacheIncrementalNow` when stale delta metadata is available
- **AND** it SHALL NOT replace the graph with the no-data state.

#### Scenario: Graph search is explicit
- **WHEN** a user types in the Graph search control
- **THEN** Workbench SHALL NOT refresh Graph filters until Search is submitted
- **AND** Clear SHALL reset Graph search immediately.

#### Scenario: Graph direction and hover labels are visible
- **WHEN** Citation Graph edges are rendered
- **THEN** Workbench SHALL use directed edge rendering and target-tinted edge color
- **AND** hovering an external neighbor of a selected library node SHALL show the external node title.

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

### Requirement: Index exposes Advanced Matching review
Workbench Index SHALL include an Advanced Matching review subview for explicit matcher proposals.

#### Scenario: User opens Advanced Matching
- **WHEN** the user switches to the Advanced Matching subview
- **THEN** Workbench SHALL show run/retry actions, operation progress, proposal counts, and proposal filters.

#### Scenario: Proposal row is rendered
- **WHEN** an open reference match proposal is listed
- **THEN** Workbench SHALL show source reference, target, confidence, score or reasons, and Accept/Reject actions.

### Requirement: Advanced matching command is protected
Advanced matching SHALL be a user-confirmed long-running command.

#### Scenario: User starts advanced matching
- **WHEN** the user clicks Run Advanced Matching
- **THEN** Workbench SHALL show a confirmation explaining that the matcher may be slower than refresh
- **AND** the command SHALL start after a busy snapshot has had a chance to render.

### Requirement: Workbench UI renders stable surface containers
Synthesis Workbench UI SHALL keep stable containers for each surface and update only the affected container for surface-local changes.

#### Scenario: Local review decision is queued
- **WHEN** the user queues or cancels a reference review decision
- **THEN** only Review/Index review surfaces and chrome MAY update
- **AND** the Workbench SHALL NOT rebuild the whole DOM.

#### Scenario: Shell-level navigation changes
- **WHEN** the selected top-level tab changes
- **THEN** shell navigation MAY update
- **AND** already mounted unrelated surface containers SHALL NOT be rebuilt because of data refresh elsewhere.

### Requirement: Workbench surfaces expose loading and error states
Each Workbench surface SHALL expose loading, ready, stale, and error states independently.

#### Scenario: Surface read fails
- **WHEN** a surface read fails
- **THEN** the host SHALL send a surface error for that surface
- **AND** other surfaces and chrome SHALL remain usable.

### Requirement: Workbench Review SHALL Render Cluster Canonical Merge Evidence
Workbench review surfaces SHALL continue to use the current proposal model and
SHALL display cluster evidence for canonical merge proposals.

#### Scenario: User reviews canonical merge
- **WHEN** Workbench renders a cluster-derived `canonical_merge` proposal
- **THEN** it SHALL prioritize readable source/target titles and edge/risk
  evidence over internal canonical ids.

### Requirement: Review Center displays reference match proposals
Workbench Review Center SHALL display both Zotero binding and canonical merge proposals.

#### Scenario: Canonical merge proposal is rendered
- **WHEN** Workbench renders a `canonical_merge` proposal
- **THEN** it SHALL show readable source and target reference titles, confidence, score, and reasons
- **AND** it SHALL provide Accept and Reject actions.

