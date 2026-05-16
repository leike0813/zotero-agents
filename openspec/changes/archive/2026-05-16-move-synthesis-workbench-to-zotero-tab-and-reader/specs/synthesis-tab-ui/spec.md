## MODIFIED Requirements

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
