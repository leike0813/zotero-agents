# synthesis-workbench-surface-refresh Specification

## Purpose
TBD - created by archiving change refactor-synthesis-workbench-surface-refresh-architecture. Update Purpose after archive.
## Requirements
### Requirement: Workbench loads Shell, Chrome, and Surfaces independently


Synthesis Workbench SHALL separate shell structure, chrome status, and named surface read models.

#### Scenario: Topic synthesis workflow completes

- **WHEN** a create or update topic synthesis command completes
- **THEN** the Workbench SHALL mark Home, Topics, Topic Graph, and Review
  surfaces dirty
- **AND** it SHALL immediately reload the active surface when that surface is
  one of the invalidated surfaces.

#### Scenario: Topic graph relation decision completes

- **WHEN** a topic graph relation proposal or relation review item is accepted,
  rejected, approved, or rejected
- **THEN** the Workbench SHALL mark Home, Topic Graph, and Review surfaces dirty
- **AND** it SHALL immediately reload the active surface when that surface is
  one of the invalidated surfaces.
### Requirement: Surface refresh is scoped to one area

Workbench surface updates SHALL refresh only the requested surface container.

#### Scenario: Index surface updates
- **WHEN** the host sends an `index` surface update
- **THEN** the frontend SHALL replace only the Index surface container
- **AND** it SHALL NOT rebuild Graph, Tags, Concepts, Review, or the shell.

#### Scenario: Chrome updates
- **WHEN** operation progress changes
- **THEN** the host SHALL send chrome state only
- **AND** content surfaces SHALL NOT be refreshed.
### Requirement: Workbench warmup is phased and non-blocking

Synthesis Workbench warmup SHALL run in bounded phases that yield to Zotero's event loop.

#### Scenario: Startup warmup runs
- **WHEN** Synthesis warmup starts after plugin startup
- **THEN** it SHALL load chrome and surface caches in phases
- **AND** it SHALL yield between phases using plugin-safe timer-based yielding.

#### Scenario: Visible surface is not warm
- **WHEN** a user opens a surface before warmup has loaded it
- **THEN** the UI SHALL show a preparing state
- **AND** the host SHALL prioritize loading that surface without running a full snapshot.
### Requirement: Full snapshot is debug-only

Full Workbench snapshot construction SHALL NOT be an active UI hot path.

#### Scenario: Active Workbench host code handles UI actions
- **WHEN** `ready`, `selectTab`, `setFilters`, progress polling, or local review actions are handled
- **THEN** the code SHALL NOT call the debug full snapshot API
- **AND** it SHALL NOT request `refreshFromService: true` as a shorthand for full UI refresh.

### Requirement: Surface refresh responses SHALL be generation guarded

Synthesis Workbench surface refresh payloads SHALL carry request generation
metadata and stale responses SHALL NOT overwrite current UI state.

#### Scenario: Earlier surface request resolves after a newer request

- **WHEN** the host starts two refreshes for the same surface
- **AND** the earlier refresh resolves after the later refresh has been accepted
- **THEN** the earlier response SHALL be ignored by the iframe
- **AND** it SHALL NOT replace `state.snapshot` or the visible surface content.

#### Scenario: Scheduled active refresh runs after tab switch

- **WHEN** an active-surface refresh is scheduled for one surface
- **AND** the user switches to another surface before the scheduled callback runs
- **THEN** the host SHALL drop the scheduled refresh
- **AND** it SHALL NOT reinterpret the callback as a refresh for the new active surface.

### Requirement: Surface errors SHALL preserve last-known-good data

Surface refresh failures SHALL NOT clear valid previously rendered data.

#### Scenario: Surface refresh fails after data was rendered

- **WHEN** a visible surface already has a last-known-good snapshot
- **AND** a later refresh for that surface fails
- **THEN** the Workbench SHALL keep the last-known-good surface content visible
- **AND** it SHALL show a refresh diagnostic for the failed refresh.

### Requirement: Score note changes SHALL invalidate only the Index surface

Score-note and owned-image notifications SHALL invalidate only the Synthesis
Index read model.

#### Scenario: Score note or child image changes

- **WHEN** a literature-score note, its payload image, or its radar image is
  added, modified, or removed
- **THEN** the Workbench SHALL mark Index dirty and refresh it when visible
- **AND** it SHALL NOT rebuild the sidecar, graph, topics, or unrelated surfaces.

### Requirement: Chrome refreshes SHALL be coalesced per Workbench runtime

Each Workbench runtime SHALL allow at most one chrome read in flight. Requests
arriving while that read is active SHALL merge into at most one follow-up read,
and any forced-refresh request in the merged set SHALL make the follow-up read
forced. Cross-runtime load SHALL remain bounded by sidecar transport admission.

#### Scenario: Repeated refreshes overlap one chrome read

- **WHEN** multiple chrome refresh requests arrive before the active chrome read completes
- **THEN** the Workbench issues no additional concurrent chrome read for that runtime
- **AND** it issues at most one follow-up read after the active read completes
- **AND** the follow-up retains forced-refresh intent when any merged request was forced

#### Scenario: Workbench runtime is cleaned up while refresh is queued

- **WHEN** a chrome read is active and a follow-up refresh is queued
- **AND** the Workbench runtime is cleaned up
- **THEN** the queued refresh is discarded
- **AND** the completed stale response does not update the Workbench
