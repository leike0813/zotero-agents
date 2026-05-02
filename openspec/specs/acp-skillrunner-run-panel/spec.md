# acp-skillrunner-run-panel Specification

## Purpose
TBD - created by archiving change add-acp-skillrunner-run-panel. Update Purpose after archive.
## Requirements
### Requirement: ACP SkillRunner-compatible runs SHALL have a dedicated panel

The system SHALL provide a dedicated UI panel for workflow jobs whose request kind is `skillrunner.job.v1` and whose backend type is `acp`.

#### Scenario: Opening from dashboard home
- **WHEN** the Task Dashboard home is rendered
- **THEN** it SHALL include an ACP Skill Runs entry with a button to open the dedicated panel.

#### Scenario: Opening from a workflow task
- **WHEN** a running task has backend type `acp` and request kind `skillrunner.job.v1`
- **THEN** opening the task SHALL route to the ACP Skill Run panel.

### Requirement: ACP SkillRunner-compatible runs SHALL be tracked separately from chat

The system SHALL record ACP SkillRunner-compatible run state in a run store keyed by `requestId`, and SHALL NOT write these runs to ACP chat conversation storage.

#### Scenario: Runner emits stages
- **WHEN** the orchestrator creates a workspace, materializes a skill, starts ACP, prompts, repairs output, validates output, succeeds, fails, or cancels
- **THEN** the run store SHALL expose those stages in the selected run snapshot.

### Requirement: Panel SHALL support observation and cancellation

The panel SHALL show run metadata, workspace, agent family, skill roots, uv dependency status, repair rounds, validation status, result path, and correlated runtime logs. It SHALL support canceling the active ACP session when available.

#### Scenario: Cancel run
- **WHEN** a user invokes cancel for a running ACP skill run
- **THEN** the host SHALL request cancellation through the run controller and update the run state to canceled or failed with a clear diagnostic if cancellation is unavailable.

