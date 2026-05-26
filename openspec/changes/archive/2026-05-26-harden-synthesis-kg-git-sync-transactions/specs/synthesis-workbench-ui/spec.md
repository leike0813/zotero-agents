## MODIFIED Requirements

### Requirement: Workbench exposes Synthesis KG operational state

The Workbench SHALL expose Git Sync state and actions without leaking credentials or making raw Git terminology the primary user-facing language.

#### Scenario: Conflict blocks sync

- **WHEN** Git Sync queue state is `blocked_conflict`
- **THEN** the Workbench SHALL render affected canonical asset relative paths and reasons
- **AND** it SHALL expose retry or reviewed action placeholders
- **AND** it SHALL NOT show credentials or unredacted absolute paths.
