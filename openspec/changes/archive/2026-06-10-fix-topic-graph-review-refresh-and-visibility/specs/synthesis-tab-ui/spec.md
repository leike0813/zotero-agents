## MODIFIED Requirements

### Requirement: Synthesis workbench has stable MVP views

The Synthesis workbench SHALL expose Overview, Topics, Registry, Citation Graph,
and structured Topic Detail views.

#### Scenario: Topic graph inspector opens topic details

- **WHEN** the Topic Graph view has a selected materialized topic
- **THEN** the inspector SHALL expose an action to open that topic's structured
  Topic Detail view
- **AND** the action SHALL use the host-owned topic artifact command.

#### Scenario: Topic graph relations are visually legible

- **WHEN** the Topic Graph view renders relation edges
- **THEN** relation lines SHALL be visible enough to distinguish graph structure
- **AND** suggested or stale relations MAY remain dashed while retaining adequate
  contrast.

### Requirement: Synthesis Workbench review center is domain complete

The Review page SHALL show the active review records for each selected review
domain without requiring the user to inspect another tab.

#### Scenario: Topic graph review tab shows relation ledger

- **WHEN** the Topic Graph review tab is selected
- **THEN** non-deleted topic graph relation edges SHALL be shown
- **AND** non-deleted topic graph relation review items SHALL be shown
- **AND** pending records SHALL expose their review actions
- **AND** decided records SHALL remain visible without repeat decision actions.
