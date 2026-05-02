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

The ACP runner SHALL read `result/result.json`, validate it, and issue bounded
repair prompts when validation fails.

#### Scenario: Repair limit reached
- **GIVEN** the output remains invalid after three repair prompts
- **WHEN** the runner finishes validation
- **THEN** the provider result SHALL fail with validation diagnostics

