## ADDED Requirements

### Requirement: Submission decoration SHALL be task-row scoped

Submission symbol, tooltip, provider/model display metadata, and resumption-pending state SHALL enter only the affected task row and necessary task-drawer parent signatures. They MUST NOT enter transcript, toolbar, banner, plan, hint, reply, context drawer, details drawer, permission drawer, or whole-runner signatures.

#### Scenario: Submission decoration changes

- **WHEN** an unfinished row gains or changes resumption-pending or submission display fields
- **THEN** the affected drawer row SHALL update
- **AND** transcript, Runner pane, and every non-drawer managed region SHALL retain DOM identity

