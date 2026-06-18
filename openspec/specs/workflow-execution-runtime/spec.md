# workflow-execution-runtime Specification

## Purpose
TBD - created by archiving change add-literature-digest-auto-tag-regulator. Update Purpose after archive.
## Requirements
### Requirement: Sequence step apply contexts


The workflow runtime SHALL make successful `skillrunner.sequence.v1` step
results available to workflow `applyResult` hooks.

#### Scenario: Apply hook reads intermediate step result

- **GIVEN** a sequence workflow completes multiple steps
- **WHEN** applyResult is invoked
- **THEN** the hook can access each step request id, provider result,
  bundleReader, and resultContext.
### Requirement: ACP-only sequence dispatch


`skillrunner.sequence.v1` workflow execution SHALL fail closed when the selected
backend is not ACP.

#### Scenario: Non-ACP backend selected

- **GIVEN** a sequence workflow is prepared with a non-ACP backend
- **WHEN** execution starts
- **THEN** the workflow is rejected before launching any step.
### Requirement: ACP sequence runs preserve Host-only continuation state


`skillrunner.sequence.v1` execution SHALL persist parent workflow context,
step request ids, completed step outputs, current step index, and terminal
state in Host storage without writing sequence orchestration files into ACP
workspaces.

#### Scenario: Step request id is recorded for recovery

- **WHEN** a sequence step emits an ACP `request-created` event
- **THEN** Host SHALL record that request id against the current sequence step
- **AND** the first step request id SHALL remain available as the parent
  workflow task request id.
### Requirement: Recovered non-final ACP sequence steps continue downstream


Host SHALL record recovered ACP step output and continue downstream sequence
execution when the recovered step belongs to a `skillrunner.sequence.v1` run and
is not the final step.

#### Scenario: Middle step recovers

- **GIVEN** a non-final ACP sequence step is in recovery
- **WHEN** its recovered output validates as final
- **THEN** Host SHALL store that step output
- **AND** Host SHALL launch the next sequence step with normal handoff mapping
- **AND** workflow apply SHALL NOT run for the recovered intermediate step.

#### Scenario: Final step recovers

- **GIVEN** the recovered ACP sequence step is the declared final step
- **WHEN** its recovered output validates as final
- **THEN** Host SHALL run workflow apply using the parent workflow id.

#### Scenario: Sequence state is unavailable for a middle step

- **GIVEN** a recovered ACP run is marked as a non-final sequence step
- **AND** Host cannot find matching sequence state by step request id
- **WHEN** recovery tries to continue
- **THEN** Host SHALL fail with a structured error containing the request id,
  workflow id, skill id, and sequence step id.
### Requirement: Failed or canceled sequence steps stop continuation


Host SHALL terminate the sequence when a step fails or is explicitly canceled.

#### Scenario: Upstream step is canceled

- **WHEN** a sequence step returns canceled
- **THEN** Host SHALL mark the sequence canceled
- **AND** Host SHALL NOT launch downstream steps.
### Requirement: Workflow runtime executes skillrunner sequences serially

The workflow runtime SHALL execute `skillrunner.sequence.v1` requests step by
step and SHALL not enqueue sequence steps as independent parallel workflow
jobs.

#### Scenario: Sequence handoff uses canonical result JSON

- **WHEN** an ACP or SkillRunner sequence step succeeds
- **THEN** downstream handoff SHALL use `ProviderExecutionResult.resultJson` as
  the step output
- **AND** runtime SHALL NOT infer business output from `responseJson.result`.

#### Scenario: Successful sequence step without result JSON fails closed

- **WHEN** an ACP or SkillRunner sequence step reports success without
  `ProviderExecutionResult.resultJson`
- **THEN** sequence runtime SHALL treat that as a provider contract error
- **AND** downstream steps SHALL NOT start from provider raw metadata.
### Requirement: Opt-in skill run feedback runtime option

The workflow execution runtime SHALL expose a default-off global preference named `collectSkillRunFeedbackEnabled` that controls whether skill run feedback collection is requested.

#### Scenario: Preference disabled

- **WHEN** the preference is disabled
- **THEN** SkillRunner job and sequence requests do not include `runtime_options.collect_skill_run_feedback`

#### Scenario: Preference enabled

- **WHEN** the preference is enabled
- **THEN** SkillRunner job and sequence requests include `runtime_options.collect_skill_run_feedback: true`
- **AND** existing runtime options remain preserved

### Requirement: Collect feedback only after successful apply

The workflow execution runtime SHALL attempt skill run feedback collection only after a provider job succeeded and the workflow business apply completed successfully.

#### Scenario: Apply succeeds

- **WHEN** a skill job succeeds and business apply succeeds
- **THEN** the runtime attempts to read `_skill_run_feedback.md` from the skill result subspace

#### Scenario: Non-success route

- **WHEN** a job fails, is canceled, remains pending or recoverable, or business apply fails
- **THEN** the runtime does not collect skill run feedback

#### Scenario: Feedback is unavailable

- **WHEN** the feedback sidecar is missing, empty, or unreadable
- **THEN** the runtime logs diagnostic information
- **AND** the main apply summary counters are unchanged by the feedback collection attempt

### Requirement: Workflow selection validation is declarative

Workflow input filtering SHALL be represented by manifest `validateSelection`
and evaluated before request construction.

#### Scenario: Request build is not used for availability

- **WHEN** a workflow menu or diagnostic probe checks whether a workflow can run
- **THEN** it SHALL evaluate `validateSelection`
- **AND** it SHALL NOT call `buildRequest` or any workflow hook.

#### Scenario: filterInputs is rejected

- **WHEN** a workflow manifest declares `hooks.filterInputs`
- **THEN** the loader SHALL reject the manifest as invalid.

#### Scenario: execution consumes scoped selection contexts

- **WHEN** execution starts
- **THEN** the runtime SHALL evaluate `validateSelection` in execute mode
- **AND** build one request per returned scoped selection context
- **AND** raise `NO_VALID_INPUT_UNITS` when no valid context remains.
