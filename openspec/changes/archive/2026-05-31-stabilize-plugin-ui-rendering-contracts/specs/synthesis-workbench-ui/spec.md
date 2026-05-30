## MODIFIED Requirements

### Requirement: Workbench UI preserves active interaction state during live updates

The Synthesis Workbench SHALL avoid rebuilding active content for updates that
only affect status chrome.

#### Scenario: Background job updates while Index is open

- **WHEN** the Index tab content rows and filters are unchanged
- **AND** only action or background job status changes
- **THEN** the Workbench SHALL update the statusbar/task chrome without
  rebuilding the Index table
- **AND** open reference details and table scroll position SHALL remain stable.

#### Scenario: Background job updates while Citation Graph is open

- **WHEN** Citation Graph nodes, edges, coordinates, filters, and selected item
  are unchanged
- **AND** only action or background job status changes
- **THEN** the Workbench SHALL update the statusbar/task chrome without
  destroying the Sigma renderer
- **AND** graph camera state SHALL remain stable.

