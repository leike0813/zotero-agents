# synthesis-workbench-surface-refresh Specification

## Purpose
TBD - created by archiving change refactor-synthesis-workbench-surface-refresh-architecture. Update Purpose after archive.
## Requirements
### Requirement: Workbench loads Shell, Chrome, and Surfaces independently
Synthesis Workbench SHALL separate shell structure, chrome status, and named surface read models.

#### Scenario: Workbench iframe is ready
- **WHEN** the Workbench sends the `ready` action
- **THEN** the host SHALL send lightweight shell/chrome state without constructing a full Synthesis snapshot
- **AND** the host SHALL request or serve only the initially selected surface.

#### Scenario: User selects a tab
- **WHEN** the user selects a Workbench tab
- **THEN** the frontend SHALL switch the shell state immediately
- **AND** the host SHALL load only that tab's named surface when it is missing or dirty
- **AND** a loaded clean surface SHALL be served from the cached read model without a service reload.

#### Scenario: Operation invalidates hidden surfaces
- **WHEN** an operation completes and invalidates surfaces that are not currently visible
- **THEN** those surfaces SHALL be marked dirty
- **AND** they SHALL NOT be reloaded until viewed or explicitly refreshed.

#### Scenario: Zotero Library item metadata changes
- **WHEN** Zotero emits a parent item add, modify, delete, trash, or refresh notification
- **THEN** the Workbench host SHALL mark the Index surface dirty because its Zotero Library metadata is direct-read SSOT
- **AND** it MAY debounce and reload only the Index surface when Index is visible
- **AND** it SHALL NOT start Reference Sidecar refresh, rebuild Citation Graph/Tag/Concept caches, or change `synt_cache_basis`.

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

