## ADDED Requirements

### Requirement: Workbench exposes Synthesis KG operational state

The Workbench SHALL expose Git Sync state and actions without leaking credentials or making raw Git terminology the primary user-facing language.

#### Scenario: Sync status is rendered

- **WHEN** the Workbench snapshot contains Git Sync state
- **THEN** the UI SHALL render queue status, last run status, sanitized remote/branch, diagnostics summary, and available actions.

#### Scenario: Conflict blocks sync

- **WHEN** Git Sync queue state is `blocked_conflict`
- **THEN** the Workbench SHALL render a conflict panel with affected canonical assets
- **AND** the panel SHALL offer retry or conflict-resolution action placeholders
- **AND** it SHALL NOT show credentials or unredacted absolute paths.
