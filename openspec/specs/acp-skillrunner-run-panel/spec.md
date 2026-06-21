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

### Requirement: ACP Skills run secondary labels SHALL be consistent

ACP Skills selected-run banners and run drawer task cards SHALL use the same secondary label rule as SkillRunner runs.

#### Scenario: Single ACP Skills workflow shows current skill
- **WHEN** a single ACP Skills workflow run has `skillName`
- **THEN** the banner subtitle SHALL show `skillName`
- **AND** the task-card secondary line SHALL show `skillName -> skillId -> requestId`
- **AND** workflow label SHALL NOT replace the skill label for single runs

#### Scenario: ACP Skills sequence step shows step skill and workflow
- **WHEN** an ACP Skills sequence step has step index `1`, `skillName`, and `workflowLabel`
- **THEN** the banner subtitle SHALL show `2️⃣ <skillName>/<workflowLabel>`
- **AND** the task-card secondary line SHALL show the same value

### Requirement: ACP Skills read model SHALL preserve sequence step index

ACP Skills run records and summaries SHALL preserve `sequenceStepIndex` when a sequence step run is recorded.

#### Scenario: ACP sequence step index reaches UI projection
- **WHEN** an ACP skill run update includes `sequenceStepIndex`
- **THEN** the run record SHALL retain that number
- **AND** list summaries SHALL include that number

