## ADDED Requirements

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
