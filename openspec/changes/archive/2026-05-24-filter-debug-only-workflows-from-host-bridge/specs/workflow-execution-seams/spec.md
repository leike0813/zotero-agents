## MODIFIED Requirements

### Requirement: Debug-only workflow visibility SHALL be gated by debug mode
The system SHALL allow builtin workflows to declare `debug_only: true` and SHALL
hide those workflows from normal workflow menus, workflow lists, and Host Bridge
workflow discovery when hardcoded debug mode is disabled. Host Bridge workflow
submit SHALL also treat hidden debug-only workflows as not found.

#### Scenario: Debug mode enabled
- **WHEN** hardcoded debug mode is enabled
- **THEN** `debug_only` workflows are visible in workflow menus and workflow lists
- **AND** Host Bridge workflow list includes `debug_only` workflows
- **AND** Host Bridge workflow submit may invoke `debug_only` workflows.

#### Scenario: Debug mode disabled
- **WHEN** hardcoded debug mode is disabled
- **THEN** `debug_only` workflows are hidden from workflow menus and workflow lists
- **AND** Host Bridge workflow list excludes `debug_only` workflows
- **AND** Host Bridge workflow submit for a `debug_only` workflow id returns `workflow_not_found`.

#### Scenario: Existing run status remains queryable
- **WHEN** hardcoded debug mode is disabled after a debug-only workflow has already produced task or run records
- **THEN** Host Bridge task and run status endpoints may still return those existing records.
