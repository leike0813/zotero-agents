## ADDED Requirements

### Requirement: Standalone Synthesis topic export mode

The Synthesis Workbench frontend SHALL support an internal standalone topic
export mode that renders from an embedded export envelope and does not require a
live Zotero host bridge.

#### Scenario: Standalone boot uses embedded data

- **GIVEN** a generated HTML file defines a valid Synthesis topic export envelope
- **WHEN** the Synthesis Workbench app starts
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
