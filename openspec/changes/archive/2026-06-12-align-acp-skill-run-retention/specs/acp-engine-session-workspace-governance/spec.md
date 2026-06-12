## MODIFIED Requirements

### Requirement: Task workspace retention follows task history retention

The system SHALL align ACP task workspace cleanup with task history cleanup and
SHALL apply the default 30-day task history retention to persisted ACP Skills
run workspaces.

#### Scenario: Terminal ACP Skills run exceeds retention

- **WHEN** an ACP Skills run is terminal, removed or archived, and older than the
  task history retention threshold
- **THEN** retention cleanup MUST delete its persisted ACP skill run row
- **AND** retention cleanup MUST delete its workspace under
  `runtime/acp/skill-runs`.

#### Scenario: Active ACP Skills run exceeds retention

- **WHEN** an ACP Skills run is non-terminal or still recoverable
- **THEN** retention cleanup MUST NOT delete its persisted run row
- **AND** retention cleanup MUST NOT delete its workspace solely because its
  timestamp is older than the retention threshold.

#### Scenario: Fresh terminal ACP Skills run

- **WHEN** an ACP Skills run is terminal but still within task history retention
- **THEN** retention cleanup MUST preserve its persisted run row
- **AND** retention cleanup MUST preserve its workspace.
