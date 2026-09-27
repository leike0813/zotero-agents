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

- **WHEN** the user invokes a hosted Synthesis Workbench entry point in Zotero
- **THEN** the host SHALL open or select a Zotero tab with type `synthesis-workbench`
- **AND** repeated invocations SHALL reuse the existing tab rather than opening multiple Workbench dialogs.

### Requirement: Synthesis Workbench SHALL localize fixed UI through host-provided messages

The hosted Synthesis Workbench page SHALL render user-visible fixed UI text
through a Synthesis i18n message dictionary supplied by the host bridge.
Standalone exports SHALL resolve fixed UI text from their embedded export or
template messages and the shared fallback dictionary without contacting a host.

#### Scenario: Host initializes Workbench locale

- **WHEN** the host sends `synthesis:init`, `synthesis:snapshot`,
  `synthesis:chrome`, `synthesis:surface`, or `synthesis:surface-error`
- **THEN** the payload MAY include `i18n.locale` and `i18n.messages`
- **AND** the Workbench SHALL apply those messages before rendering the affected
  chrome or surface
- **AND** the i18n envelope SHALL NOT become part of the business snapshot DTO.

#### Scenario: Fixed UI text is rendered

- **WHEN** Workbench renders navigation, tabs, table headers, buttons, status
  labels, placeholders, titles, aria labels, empty states, or loading/error text
- **THEN** it SHALL resolve the displayed text from the Synthesis i18n
  dictionary or the default English fallback.

#### Scenario: Index artifact availability is rendered

- **WHEN** the Synthesis Index renders digest, references, or citation-analysis
  availability for a registry row
- **THEN** it SHALL use the artifact icon assets instead of D/R/C text badges
- **AND** available or missing state SHALL continue to come from the registry row
  artifact coverage/status data.
- **AND** the icon title and accessible label SHALL identify the artifact and
  its availability.

### Requirement: Standalone Synthesis topic export mode

Standalone topic exports SHALL use an independent entry that renders from an
embedded export envelope, reuses the required reader and graph modules, and does
not require the complete hosted Workbench renderer or a live Zotero host bridge.

#### Scenario: Standalone boot uses embedded data

- **GIVEN** a generated HTML file defines a valid Synthesis topic export envelope
- **WHEN** the standalone topic export entry starts
- **THEN** it renders Topic Details from the embedded snapshot and topic detail
- **AND** it does not send the normal host `ready` action
- **AND** it does not request data from Zotero or Synthesis storage

#### Scenario: Embedded digest artifacts are available offline

- **GIVEN** the export envelope contains resolved digest artifacts for the topic source papers
- **WHEN** a user opens a digest link in the standalone HTML
- **THEN** the digest modal renders from the embedded digest payload
- **AND** missing or failed digest payloads show an unavailable local state without host calls

#### Scenario: Topic citation subgraph is a readonly Topic Details tab

- **GIVEN** the export envelope contains a topic-scoped citation graph snapshot
- **WHEN** a user opens the Citation Graph tab in the standalone HTML
- **THEN** the graph uses the same visual node and edge rendering as the Workbench graph
- **AND** the embedded graph data is limited to the current topic citation subgraph, not the global graph or other topic subgraphs
- **AND** pan, zoom, hover neighborhood, and selection drawer interactions remain available
- **AND** role, node-kind, low-signal, and layout controls remain available offline
- **AND** topic scope controls are not shown
- **AND** graph search and graph-return controls are not shown
- **AND** graph cache rebuild, refresh, redraw layout, and other host-mutating controls are not shown
