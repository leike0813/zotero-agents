# synthesis-tab-ui Specification

## Purpose
TBD - created by archiving change add-synthesis-tab-ui. Update Purpose after archive.
## Requirements
### Requirement: Synthesis workbench uses host-owned bridge

The Synthesis UI SHALL use a host-owned bridge for snapshot delivery and action
routing.

#### Scenario: Web panel initializes

- **WHEN** the Synthesis web panel sends a ready action
- **THEN** the host SHALL send `synthesis:init`
- **AND** the payload SHALL be a DTO snapshot.

#### Scenario: Web panel requests an action

- **WHEN** the web panel sends `synthesis:action`
- **THEN** the host SHALL accept only known action names
- **AND** it SHALL normalize payload before mutating host state.

### Requirement: Synthesis UI does not access host resources directly

The web panel SHALL NOT access Zotero APIs, local files, canonical assets, or
filesystem paths directly.

#### Scenario: User opens a canonical artifact

- **WHEN** the user invokes an open action in the web panel
- **THEN** the web panel SHALL send a host action
- **AND** the host SHALL perform or reject the command.

### Requirement: Citation graph explorer uses persisted layout presets

The graph explorer SHALL display host-provided graph slices and persisted
layout preset coordinates.

#### Scenario: User changes layout preset

- **WHEN** a user selects `compact`, `balanced`, or `expanded`
- **THEN** the UI state SHALL switch preset
- **AND** it SHALL NOT run full-graph D3-force simulation in the web panel.

### Requirement: Synthesis workbench has stable MVP views

The Synthesis workbench SHALL expose Overview, Artifacts, Registry, and Citation
Graph views.

#### Scenario: Snapshot includes sync diagnostics

- **WHEN** the host sends sync recovery diagnostics or conflict candidate
  summaries
- **THEN** the Overview view SHALL render the degraded state and candidate
  counts without direct filesystem or Zotero access.

