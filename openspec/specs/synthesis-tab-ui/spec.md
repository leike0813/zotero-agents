# synthesis-tab-ui Specification

## Purpose
TBD - created by archiving change add-synthesis-tab-ui. Update Purpose after archive.
## Requirements
### Requirement: Synthesis workbench uses host-owned bridge

The Synthesis UI SHALL use a host-owned bridge for snapshot delivery and action
routing, and its product entry point SHALL be a singleton Zotero main-area tab.

#### Scenario: Web panel initializes

- **WHEN** the Synthesis web panel sends a ready action
- **THEN** the host SHALL send `synthesis:init`
- **AND** the payload SHALL be a DTO snapshot.

#### Scenario: Web panel requests an action

- **WHEN** the web panel sends `synthesis:action`
- **THEN** the host SHALL accept only known action names
- **AND** it SHALL normalize payload before mutating host state.

#### Scenario: Workbench entry opens Zotero tab

- **WHEN** the user invokes any Synthesis Workbench entry point
- **THEN** the host SHALL open or select a Zotero tab with type `synthesis-workbench`
- **AND** repeated invocations SHALL reuse the existing tab rather than opening multiple Workbench dialogs.

### Requirement: Synthesis UI does not access host resources directly

The web panel SHALL NOT access Zotero APIs, local files, canonical assets, or
filesystem paths directly.

#### Scenario: User opens a canonical artifact

- **WHEN** the user invokes an open action in the web panel
- **THEN** the web panel SHALL send a host action
- **AND** the host SHALL read the canonical artifact and send an artifact reader DTO
- **AND** the DTO SHALL include rendered-input Markdown text and metadata without exposing local filesystem paths.

#### Scenario: User opens an assets folder

- **WHEN** the user explicitly invokes an open-folder action
- **THEN** the host MAY open or reveal the folder through Zotero host APIs.

### Requirement: Citation graph explorer uses persisted layout presets

The graph explorer SHALL display host-provided graph slices and persisted
layout preset coordinates.

#### Scenario: User changes layout preset

- **WHEN** a user selects `compact`, `balanced`, or `expanded`
- **THEN** the UI state SHALL switch preset
- **AND** it SHALL NOT run full-graph D3-force simulation in the web panel.

### Requirement: Synthesis workbench has stable MVP views

The Synthesis workbench SHALL expose Overview, Artifacts, Registry, Citation
Graph, and Artifact Reader views.

#### Scenario: Snapshot includes sync diagnostics

- **WHEN** the host sends sync recovery diagnostics or conflict candidate
  summaries
- **THEN** the Overview view SHALL render the degraded state and candidate
  counts without direct filesystem or Zotero access.

#### Scenario: Artifact reader displays Markdown

- **WHEN** the host sends a `synthesis:artifact` DTO
- **THEN** the Workbench SHALL switch to the reader view
- **AND** it SHALL render Markdown as HTML using local renderer assets rather than showing raw source as the default view.

### Requirement: Synthesis Workbench exposes artifact lifecycle controls

The Synthesis Workbench SHALL let users soft delete active topic synthesis
artifacts and purge previously deleted topic artifacts through host-owned
commands.

#### Scenario: User deletes an active artifact

- **WHEN** the user clicks Delete for an artifact row and confirms
- **THEN** the web panel SHALL send a host command for that topic
- **AND** the host SHALL call the Synthesis service delete operation
- **AND** the refreshed snapshot SHALL no longer show the topic in active
  artifacts.

#### Scenario: User purges deleted artifacts

- **WHEN** deleted artifacts exist and the user confirms Purge Deleted
- **THEN** the web panel SHALL send a host command
- **AND** the host SHALL call the Synthesis service purge operation
- **AND** the refreshed snapshot SHALL show no pending deleted artifacts.

#### Scenario: User cancels a lifecycle confirmation

- **WHEN** the user cancels Delete or Purge confirmation
- **THEN** the host SHALL NOT call the Synthesis service mutation.

### Requirement: Synthesis Workbench displays topic artifact freshness

The Synthesis Workbench SHALL display freshness from the Synthesis service
instead of hard-coded values.

#### Scenario: Artifact row uses scanned freshness

- **WHEN** Workbench receives a snapshot
- **THEN** each topic artifact row SHALL show the service-provided freshness
  state
- **AND** `dirty` SHALL be accepted as a valid freshness filter value.

#### Scenario: Workbench refresh scans freshness

- **WHEN** Workbench opens or the user refreshes the snapshot
- **THEN** the host SHALL return a snapshot after the service has scanned active
  topic freshness
- **AND** it SHALL NOT start an agent update workflow automatically.

### Requirement: Synthesis Workbench exposes a dense topic workbench

The Synthesis Workbench SHALL provide Home, Topics, Graph, Index, and Reader
views inside a Zotero tab.

#### Scenario: User opens Synthesis Home

- **WHEN** the Synthesis snapshot is available
- **THEN** the Home view SHALL show library insight cards
- **AND** it SHALL show top topic cards using topic metrics supplied by the
  snapshot.

#### Scenario: User browses topics

- **WHEN** the user opens the Topics view
- **THEN** the view SHALL support list and grid presentation
- **AND** it SHALL support sorting by title, paper count, and update time.

#### Scenario: User opens Markdown reader

- **WHEN** the user opens a topic artifact
- **THEN** the Markdown reader SHALL replace the main view as an immersive page
- **AND** it SHALL preserve close/back, refresh, copy, and open-folder actions.

### Requirement: Synthesis topic summaries expose card metrics

Topic artifact rows SHALL include metrics required by the Home and Topics card
views.

#### Scenario: Snapshot normalizes a topic row

- **WHEN** a topic row contains paper count, summary, completion, and update time
- **THEN** the normalized snapshot SHALL preserve those fields
- **AND** filtered topic rows SHALL remain sorted according to the selected
  topic sort.

