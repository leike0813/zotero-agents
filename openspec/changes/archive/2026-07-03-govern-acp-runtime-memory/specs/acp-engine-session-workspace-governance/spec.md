## MODIFIED Requirements

### Requirement: Task workspace retention follows task history retention

The system SHALL align task workspace cleanup with task history cleanup. ACP
Skill runtime files, including transcript JSONL, output revisions, continuation
context, and result artifacts, SHALL be stored under the run workspace/runtime
directory so they are governed by the same retention lifecycle.

#### Scenario: Task history retention expires

- **WHEN** an ACP task history record becomes eligible for cleanup
- **THEN** its task workspace SHOULD also become eligible for cleanup
- **AND** the default retention policy SHOULD follow the existing 30-day task
  history retention.

#### Scenario: Terminal ACP Skills run exceeds retention

- **WHEN** an ACP Skills run is terminal, removed or archived, and older than the
  task history retention threshold
- **THEN** retention cleanup MUST delete its persisted ACP skill run row
- **AND** retention cleanup MUST delete its workspace under
  `runtime/acp/skill-runs`
- **AND** retention cleanup MUST delete the run's file-backed transcript,
  output revision, and continuation context files because they live under that
  workspace.

#### Scenario: Terminal ACP Skills run has a separate runtime directory

- **WHEN** an expired terminal ACP Skills run has `runtimeDir` under
  `runtime/acp/skill-runs` but no deletable `workspaceDir`
- **THEN** retention cleanup MUST delete the persisted ACP skill run row
- **AND** retention cleanup MUST delete that `runtimeDir` after validating it is
  inside `runtime/acp/skill-runs`.

#### Scenario: Active ACP Skills run exceeds retention

- **WHEN** an ACP Skills run is non-terminal or still recoverable
- **THEN** retention cleanup MUST NOT delete its persisted run row
- **AND** retention cleanup MUST NOT delete its workspace solely because its
  timestamp is older than the retention threshold.

#### Scenario: Fresh terminal ACP Skills run

- **WHEN** an ACP Skills run is terminal but still within task history retention
- **THEN** retention cleanup MUST preserve its persisted run row
- **AND** retention cleanup MUST preserve its workspace.
