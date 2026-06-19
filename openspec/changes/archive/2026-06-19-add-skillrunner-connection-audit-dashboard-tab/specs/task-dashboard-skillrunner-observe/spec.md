## ADDED Requirements

### Requirement: Dashboard SHALL expose SkillRunner connection audit only in debug mode

The Dashboard SHALL provide a read-only SkillRunner connection audit tab only
when debug mode is enabled.

#### Scenario: debug mode shows audit tab

- **WHEN** debug mode is enabled
- **THEN** the Dashboard tab list SHALL include
  `skillrunner-connection-audit`
- **AND** selecting that tab SHALL render active connections, queued
  connections, backend/lane summaries, and recent governor lifecycle events

#### Scenario: debug mode disabled hides and gates audit data

- **WHEN** debug mode is disabled
- **THEN** the Dashboard tab list SHALL NOT include
  `skillrunner-connection-audit`
- **AND** requesting that tab SHALL fall back to `home`
- **AND** Dashboard snapshot construction SHALL NOT read the SkillRunner
  connection governor audit snapshot

### Requirement: SkillRunner connection audit SHALL be read-only

The connection audit UI SHALL NOT mutate connection governor state.

#### Scenario: audit tab has no connection mutation controls

- **WHEN** the audit tab is rendered
- **THEN** it MAY offer copy-current-JSON
- **AND** it SHALL NOT offer abort, retry, cleanup, clear-events, or other
  connection mutation actions
