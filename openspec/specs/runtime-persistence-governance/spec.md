## Purpose

Runtime persistence governance defines where indexed operational state is stored and how cold-path JSON assets are treated.

## Requirements
### Requirement: SQLite state stores indexed operational state

Runtime persistence governance SHALL separate plugin workflow/runtime SQLite state from Synthesis SQLite state.

#### Scenario: Runtime paths expose separate databases

- **WHEN** the plugin resolves runtime persistence paths
- **THEN** `stateDbPath` SHALL point to `state/zotero-agents.db`
- **AND** `synthesisDbPath` SHALL point to `state/synthesis.db`.

#### Scenario: Workflow runtime state remains in the plugin DB

- **WHEN** workflow execution, ACP, SkillRunner, workflow product metadata, or plugin task persistence writes indexed operational state
- **THEN** it SHALL use `state/zotero-agents.db`.

#### Scenario: Synthesis uses the Synthesis DB

- **WHEN** Synthesis needs state for UI, MCP, Host Bridge, review actions, workers, operation progress, or graph queries
- **THEN** it SHALL use indexed SQLite tables in `state/synthesis.db`
- **AND** it SHALL NOT store that hot state in `state/zotero-agents.db`, prefs, runtime files, or `plugin_task_rows.payload_json`.
### Requirement: Runtime SQLite access is concurrency guarded

Plugin-owned access to runtime SQLite databases SHALL use guarded SQLite execution paths.

#### Scenario: Same-path plugin transactions are coordinated

- **WHEN** plugin-owned runtime persistence code opens or writes `state/zotero-agents.db` or `state/synthesis.db`
- **THEN** access for the same normalized DB path SHALL reuse one guarded connection/coordinator inside the process
- **AND** nested guarded transactions on that connection SHALL not issue nested `BEGIN IMMEDIATE` statements.
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

### Requirement: Runtime persistence governance MUST treat runtime logs as file-backed operational diagnostics

Runtime persistence governance MUST treat retained runtime log documents as file-backed operational diagnostics, not as prefs-primary state.

#### Scenario: Runtime log file is the durable diagnostic artifact

- **WHEN** runtime persistence paths are available
- **THEN** retained runtime log documents SHALL be persisted under the runtime persistence area
- **AND** prefs SHALL only serve as a legacy migration or fallback input.

#### Scenario: Clearing runtime logs clears file-backed diagnostics

- **WHEN** runtime logs are cleared through the runtime log pipeline
- **THEN** the file-backed runtime log document SHALL be cleared
- **AND** stale migrated pref content SHALL NOT be preserved as an alternate source of truth.

