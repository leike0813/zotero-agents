## MODIFIED Requirements

### Requirement: SQLite state stores indexed operational state

Runtime persistence governance SHALL treat `state/zotero-agents.db` as the
primary location for indexed operational state, including Synthesis local
working state.

#### Scenario: Synthesis stores hot state

- **WHEN** Synthesis needs state for UI, MCP, Host Bridge, review actions, dirty
  events, workers, or graph queries
- **THEN** it SHALL store that state in indexed SQLite tables
- **AND** it SHALL NOT store the hot state primarily as large JSON payloads in
  prefs, runtime files, or `plugin_task_rows.payload_json`.

#### Scenario: Durable JSON assets exist

- **WHEN** `data/synthesis/` contains JSON canonical assets
- **THEN** they SHALL be treated as durable cold-path checkpoint/import/export
  assets
- **AND** runtime cleanup SHALL still avoid deleting them.
