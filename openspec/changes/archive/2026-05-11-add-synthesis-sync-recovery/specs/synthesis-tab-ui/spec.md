# synthesis-tab-ui Delta

## MODIFIED Requirements

### Requirement: Synthesis workbench has stable MVP views

The Synthesis workbench SHALL expose Overview, Artifacts, Registry, and Citation
Graph views.

#### Scenario: Snapshot includes sync diagnostics

- **WHEN** the host sends sync recovery diagnostics or conflict candidate
  summaries
- **THEN** the Overview view SHALL render the degraded state and candidate
  counts without direct filesystem or Zotero access.
