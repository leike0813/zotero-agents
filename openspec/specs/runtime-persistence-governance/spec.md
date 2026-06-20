## Purpose

Runtime persistence governance defines where indexed operational state is stored and how cold-path JSON assets are treated.

## Requirements
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
### Requirement: Runtime SQLite access is concurrency guarded


Plugin-owned access to `state/zotero-agents.db` SHALL use a guarded SQLite
execution path that prevents transient busy/locked storage failures from
immediately aborting user-visible startup or task execution.

#### Scenario: Transient busy write is retried

- **WHEN** a plugin-owned runtime SQLite statement or transaction boundary fails
  with a classified busy/locked storage error
- **THEN** the guarded execution path SHALL retry the operation a bounded number
  of times
- **AND** it SHALL preserve the original diagnostic context if the busy condition
  persists.

#### Scenario: Same-path plugin transactions are coordinated

- **WHEN** plugin-owned runtime persistence code opens or writes
  `state/zotero-agents.db`
- **THEN** access for the same normalized DB path SHALL reuse one guarded
  connection/coordinator inside the process
- **AND** nested guarded transactions on that connection SHALL not issue nested
  `BEGIN IMMEDIATE` statements.
### Requirement: Runtime persistence usage exposes cleanable runtime categories

Runtime persistence governance SHALL expose cleanable runtime data categories for prefs diagnostics and cleanup.

#### Scenario: Workflow product runtime data is scanned

- **WHEN** runtime persistence usage is scanned
- **THEN** the usage snapshot SHALL include a `workflow-products` category for `runtime/workflow-products`
- **AND** its bytes SHALL include managed product asset files plus indexed `workflow-products/products` row payload bytes
- **AND** its record count SHALL include `workflow-products/products` rows.

#### Scenario: Workflow product runtime data is cleaned

- **WHEN** cleanup is requested for `workflow-products`
- **THEN** runtime persistence governance SHALL clear `workflow-products/products` rows
- **AND** delete `runtime/workflow-products`
- **AND** leave original run workspaces untouched.

## ADDED Requirements

### Requirement: Runtime persistence usage exposes state databases

Runtime persistence governance SHALL expose both runtime SQLite databases for diagnostics without making them generic cleanable categories.

#### Scenario: Runtime persistence usage is scanned

- **WHEN** runtime persistence usage is scanned
- **THEN** the usage snapshot SHALL include `state/zotero-agents.db`
- **AND** it SHALL include `state/synthesis.db`
- **AND** neither database SHALL be removed by runtime retention cleanup.

