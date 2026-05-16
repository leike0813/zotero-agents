# acp-skillrunner-compatible-runner Specification

## Purpose
TBD - created by archiving change add-acp-skillrunner-compatible-runner. Update Purpose after archive.
## Requirements
### Requirement: ACP backend SHALL execute SkillRunner-compatible workflow jobs

The system SHALL allow `skillrunner.job.v1` workflow requests to execute through
an ACP backend without changing the workflow-facing request contract.

#### Scenario: ACP backend dispatches skillrunner job
- **GIVEN** a backend with `type: "acp"`
- **AND** a request with `kind: "skillrunner.job.v1"`
- **WHEN** provider dispatch resolves the request
- **THEN** it SHALL route to the ACP provider workflow runner path
- **AND** ACP chat `acp.prompt.v1` behavior SHALL remain unchanged

### Requirement: ACP runner SHALL materialize skills into agent-specific roots

The ACP runner SHALL materialize plugin-side skills into run-local skill roots
selected by ACP agent family.

#### Scenario: Codex skill roots
- **GIVEN** an ACP backend resolved as `codex`
- **WHEN** the runner materializes a skill
- **THEN** it SHALL mirror the skill into `.agents/skills/<skillId>` and
  `.codex/skills/<skillId>` under the run workspace

#### Scenario: Explicit root override
- **GIVEN** an ACP backend declares `acp.skillRoots`
- **WHEN** the runner builds the injection plan
- **THEN** those roots SHALL override the family defaults

### Requirement: ACP runner SHALL wrap workflow launches with uv when needed

The ACP runner SHALL use `uv run --with` only for workflow-run ACP launches when
the materialized skill declares runtime Python dependencies.

#### Scenario: Chat launch is unaffected
- **GIVEN** a skill declares `runtime.dependencies`
- **WHEN** the user starts normal ACP chat
- **THEN** the configured backend command and args SHALL be used unchanged

#### Scenario: Workflow launch is wrapped
- **GIVEN** a skill declares `runtime.dependencies`
- **AND** the uv probe succeeds
- **WHEN** the workflow runner launches the ACP process
- **THEN** it SHALL wrap the command with `uv run --with ... --`

### Requirement: ACP runner SHALL validate structured output and repair failures

The ACP runner SHALL validate assistant turn output and issue bounded repair
prompts when validation fails.

#### Scenario: Initial Prompt Uses Run Execution Instructions

- **GIVEN** an ACP Skills run is created for a SkillRunner-compatible job
- **WHEN** the run workspace is prepared
- **THEN** ACP Skills SHALL materialize a run-level instruction file for the resolved agent family
- **AND** the first prompt SHALL invoke the requested skill using the agent-family-specific skill syntax
- **AND** the first prompt SHALL render Skill-Runner-style Inputs, Parameters, and task text
- **AND** ACP workspace paths SHALL be included only as compact run context.

#### Scenario: Repair limit reached

- **GIVEN** the output remains invalid after three repair prompts
- **WHEN** the runner finishes validation
- **THEN** the provider result SHALL fail with validation diagnostics

#### Scenario: Repair Prompt Uses Target Contract Details

- **GIVEN** an ACP Skills output candidate fails validation
- **WHEN** the runner builds a repair prompt
- **THEN** the prompt SHALL state that the previous output did not satisfy the Skill Runner output contract
- **AND** it SHALL include the previous candidate, validation errors, branch guidance, and target output contract details
- **AND** it SHALL forbid explanations and Markdown fences.

### Requirement: ACP Skills Busy Composer SHALL Interrupt Current Turn Without Canceling Run

ACP Skills MUST distinguish interrupting the current agent turn from canceling the whole skill run.

#### Scenario: Busy ACP Skills run exposes interrupt action

- **WHEN** an ACP Skills run is `queued`, `running`, or `repairing`
- **THEN** the composer input SHALL be disabled
- **AND** the composer button SHALL emit an interrupt-current-turn action
- **AND** it SHALL NOT emit `cancel-run`.

#### Scenario: Interrupt does not cancel run record

- **WHEN** the user interrupts the current ACP Skills turn from the composer
- **THEN** the run SHALL remain available in the run list
- **AND** the run status SHALL NOT be changed to `canceled`
- **AND** the session SHALL NOT be disconnected by that action.

### Requirement: ACP Skills Panel SHALL Preserve Per-Run Composer State

ACP Skills frontend state MUST be isolated per selected run.

#### Scenario: Snapshot refresh does not steal focus

- **WHEN** a snapshot for one ACP Skills run refreshes while another run is selected
- **THEN** the selected run's input focus and draft SHALL be preserved.

#### Scenario: Terminal run continues conversation

- **WHEN** a completed run has an active follow-up prompt or reply in progress
- **THEN** the hint area SHALL show the active turn state
- **AND** it SHALL NOT remain stuck on `Run completed`.

### Requirement: ACP Skills Task Drawer SHALL Surface Waiting Tasks

ACP Skills task drawer rows MUST indicate tasks requiring user action.

#### Scenario: Waiting user task shows warning indicator

- **WHEN** a run is `waiting_user` or has a pending permission request
- **THEN** its drawer task row SHALL display a warning LED.

#### Scenario: Waiting transition emits one toast

- **WHEN** a run first enters `waiting_user` or permission-required state
- **THEN** the UI SHALL emit one toast for that transition
- **AND** repeated snapshots SHALL NOT emit duplicate toasts.

### Requirement: ACP skill runner MUST execute ACP skill run requests

ACP skill execution SHALL use `acp.skill.run.v1` as its provider-facing request
contract. The runner MUST reject `skillrunner.job.v1` at its public dispatch
boundary.

#### Scenario: Input manifest uses local paths

- **WHEN** an ACP skill run is created from a workflow with upload-derived input
- **THEN** the run input manifest SHALL contain local absolute file paths
- **AND** it SHALL NOT expose `inputs/<key>/...` upload-relative paths to the
  agent.

### Requirement: ACP Skills transcript signal governance

ACP Skills SHALL project only high-signal runtime events into the conversation transcript.

#### Scenario: Permission request and result coalesce
- **GIVEN** an ACP Skills run receives a permission request
- **WHEN** the request is later approved, denied, or cancelled
- **THEN** the transcript SHALL contain one permission item for that request
- **AND** the item status SHALL update from `pending` to the final state.

#### Scenario: Low-signal success statuses stay out of transcript
- **GIVEN** an ACP Skills run records internal success events such as prompt finished or output validation succeeded
- **WHEN** the store projects transcript items
- **THEN** those events SHALL remain in logs only
- **AND** they SHALL NOT appear as transcript status items.

