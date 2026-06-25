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

#### Scenario: Middle step recovers after plugin restart

- **GIVEN** a non-final ACP sequence step is recovered after local plugin state
  was lost
- **AND** the original ACP workflow workspace still exists
- **WHEN** its recovered output validates as final
- **THEN** Host SHALL restore the workflow workspace reuse mapping
- **AND** Host SHALL launch downstream sequence steps in the original workspace
- **AND** downstream ACP step start events SHALL preserve normal ACP Skills
  foreground selection behavior.

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

## ADDED Requirements

### Requirement: SkillRunner sequences use foreground step orchestration

`skillrunner.sequence.v1` normal execution SHALL be orchestrated by the
frontend step loop instead of active reconciler settlement.

#### Scenario: Successful step continues downstream

- **WHEN** a SkillRunner sequence step reaches terminal success
- **THEN** the foreground runtime SHALL fetch its output
- **AND** run any declared step apply hook
- **AND** build the handoff used by the next step.

#### Scenario: Waiting step detaches the sequence

- **WHEN** a SkillRunner sequence step reaches `waiting_user` or `waiting_auth`
- **THEN** the sequence SHALL enter `waiting_interaction` with pending step
  metadata
- **AND** reply/auth continuation SHALL resume from that step.

#### Scenario: Failed step stops the sequence

- **WHEN** a SkillRunner sequence step reaches `failed` or `canceled`
- **THEN** the sequence SHALL stop
- **AND** downstream steps SHALL NOT be submitted.

## ADDED Requirements

### Requirement: Runtime maps skill-level mode to provider execution mode

The workflow runtime SHALL derive SkillRunner execution mode from skill-level
request fields and map it to provider `runtime_options.execution_mode`.

#### Scenario: Single job mode is normalized

- **GIVEN** a SkillRunner job request with `mode = interactive`
- **WHEN** the runtime finalizes the request
- **THEN** the provider request SHALL include `runtime_options.execution_mode = interactive`
- **AND** the top-level `mode` helper field SHALL NOT be sent as provider wire data.

#### Scenario: Sequence steps use independent modes

- **GIVEN** a sequence request whose first step has `mode = interactive`
- **AND** the second step has `mode = auto`
- **WHEN** the runtime launches each step
- **THEN** the first concrete step request SHALL use `runtime_options.execution_mode = interactive`
- **AND** the second concrete step request SHALL use `runtime_options.execution_mode = auto`.

### Requirement: Sequence handoff SHALL use typed bindings

Sequence workflow runtime SHALL resolve step handoff from explicit `bindings` with `kind: "value" | "file"`.

#### Scenario: Value binding copies a previous step field

- **WHEN** a step declares a `value` binding from a previous step result path
- **THEN** the resolved value SHALL be written to the declared request target.

#### Scenario: No implicit pass-through

- **WHEN** a step declares no handoff binding
- **THEN** the runtime SHALL NOT inject previous step output into `input.handoff`.

### Requirement: File handoff SHALL be provider-neutral

Sequence file handoff SHALL represent a logical file artifact and SHALL be materialized by the provider dispatch boundary.

#### Scenario: ACP file handoff

- **WHEN** a sequence runs on an ACP backend
- **AND** a file binding resolves to a local file path
- **THEN** the next ACP step SHALL receive a native absolute path in input
- **AND** the request SHALL NOT contain `upload_files`.

#### Scenario: SkillRunner local file handoff

- **WHEN** a sequence runs on a SkillRunner backend
- **AND** a file binding resolves to a frontend-local file path
- **THEN** the next SkillRunner step SHALL receive an upload-relative input path
- **AND** the request SHALL include the matching `upload_files` entry.

#### Scenario: SkillRunner reused workspace file handoff

- **WHEN** a sequence runs on a SkillRunner backend
- **AND** a file binding resolves to a file produced by a previous step in the reused workspace
- **THEN** the next SkillRunner step SHALL receive an upload-relative input path
- **AND** the request SHALL include `runtime_options.workspace.file_bindings`
- **AND** the request SHALL NOT include an `upload_files` entry for the backend-local source file.

### Requirement: Sequence continuation SHALL use main step status

Sequence workflow runtime SHALL only start a downstream step when the previous step's main status is `succeeded`.

#### Scenario: Step apply failure stops sequence

- **WHEN** a sequence step backend succeeds
- **AND** its required step apply fails with `on_failure: "fail_sequence"`
- **THEN** no downstream step SHALL be submitted
- **AND** the sequence/root main status SHALL be failed.

### Requirement: Job records MUST expose typed core runtime metadata

Workflow execution job records MUST expose a stable core metadata contract for workflow, backend, provider, request, run, sequence, and SkillRunner lifecycle correlation fields.

#### Scenario: Job enqueue preserves core metadata

- **WHEN** workflow execution enqueues a job with backend, provider, request kind, run, and workflow metadata
- **THEN** the stored job record SHALL expose those fields through the typed job metadata contract
- **AND** task projection and runtime logging SHALL read the same field names.

#### Scenario: Provider progress updates request identity

- **WHEN** provider progress reports a backend request id for a running job
- **THEN** the job metadata SHALL preserve the request id in the core metadata contract
- **AND** subsequent runtime log, task dashboard, and reconciliation paths SHALL be able to correlate by that request id.

#### Scenario: Workflow-specific metadata remains extensible

- **WHEN** a workflow or provider attaches metadata outside the governed core field set
- **THEN** the job record SHALL preserve that metadata
- **AND** the existence of extension metadata SHALL NOT weaken the typed core fields.

### Requirement: SkillRunner lifecycle metadata MUST remain stable across queue and reconciliation paths

SkillRunner lifecycle metadata carried by job records MUST use stable field names across job queue failures, recoverable request handling, task projection, and reconciler settlement.

#### Scenario: Pre-ready failure records lifecycle diagnostics

- **WHEN** a SkillRunner job fails before request-ready
- **THEN** the job metadata SHALL preserve request readiness, submit phase, and submit error fields
- **AND** task projection SHALL be able to show the failed lifecycle state without inspecting provider-private objects.

#### Scenario: Recoverable request keeps correlation fields

- **WHEN** a SkillRunner request is recoverable after backend request creation
- **THEN** the job metadata SHALL retain backend id, backend type, provider id, run id, and request id
- **AND** reconciler-owned paths SHALL use those fields without relying on ad hoc unknown-map casts.
