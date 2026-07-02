## ADDED Requirements

### Requirement: CLI SHALL expose diagnostics/history/profile canonical commands

The Host Bridge CLI SHALL expose profile/backend diagnostics, workflow validation, permission visibility, recent history, skill-run events, and synthesis maintenance under canonical namespaces.

#### Scenario: Bridge diagnostics commands map to diagnostics endpoints

- **WHEN** an agent runs `zotero-bridge bridge profile inspect` or `zotero-bridge bridge backend status <backendId>`
- **THEN** the CLI calls the corresponding Host Bridge diagnostics endpoint
- **AND** stdout is a single JSON object.

#### Scenario: Workflow validate uses submit-shaped input

- **WHEN** an agent runs `zotero-bridge workflow validate --workflow <id> ...`
- **THEN** the CLI constructs the same selection/options/provider-profile payload shape as `workflow submit`
- **AND** Host Bridge validates without starting execution.

#### Scenario: Run commands expose permission and history

- **WHEN** an agent runs `run permission pending`, `run recent`, `run workflow recent`, or `run skill events`
- **THEN** the CLI calls the canonical run-control endpoint
- **AND** the output remains lightweight and transcript-free.

### Requirement: CLI SHALL expose synthesis maintenance safely

The CLI SHALL provide read-only synthesis cache/index status and enum-scoped cache invalidation.

#### Scenario: Cache invalidation is constrained

- **WHEN** an agent runs `zotero-bridge synthesis cache invalidate --scope <topic|graph|index>`
- **THEN** the CLI sends only the enum scope and optional opaque id
- **AND** Host Bridge approval is required before invalidation.
