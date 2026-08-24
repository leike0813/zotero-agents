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

#### Scenario: Sequence root persists in workflow orchestration store

- **GIVEN** a `skillrunner.sequence.v1` workflow is initialized
- **WHEN** `SequenceRunState` is persisted
- **THEN** the state SHALL be written to workflow sequence persistence
- **AND** ACP and SkillRunner provider run stores SHALL NOT receive the
  sequence root entry.

#### Scenario: Legacy provider sequence root entries are migrated

- **GIVEN** a persisted ACP or SkillRunner provider run entry contains
  `schema = "workflow.sequence.state.v2"` or a `sequence:<workflowRunId>` run key
- **WHEN** sequence state storage is hydrated
- **THEN** the parsed state SHALL be inserted into workflow sequence persistence
- **AND** the legacy provider run entry SHALL be deleted
- **AND** later sequence reads SHALL NOT fall back to provider run tables.

#### Scenario: Sequence steps keep concrete provider identity

- **WHEN** a sequence step is executed through ACP or SkillRunner
- **THEN** the concrete provider run SHALL use the workflow run id as `runId`
- **AND** it SHALL use `<sequenceJobId>:<sequenceStepId>` as `jobId`
- **AND** it SHALL carry `sequenceStepId`, `sequenceStepIndex`, and
  `sequenceFinalStepId` when known.
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

### Requirement: SkillRunner upload path projection SHALL come from one provider mapping module

The declarative request compiler and the sequence runtime SHALL derive
uploads-root relative input paths through one SkillRunner upload mapping module
so single-job and sequence requests share the same wire path shape.

#### Scenario: Single-job upload declarations use the shared projection

- **WHEN** a `skillrunner.job.v1` request declares `request.input.upload.files`
- **THEN** `input.<key>` SHALL be built by the shared SkillRunner upload mapping module as `inputs/<sanitized-key>/<basename>`
- **AND** `upload_files[].path` SHALL remain the local file path.

#### Scenario: Sequence frontend-local uploads use the shared projection

- **WHEN** a sequence step maps a frontend-local file into SkillRunner input
- **THEN** the upload-relative `input.<key>` SHALL be built by the same shared mapping module
- **AND** the matching `upload_files` entry SHALL reference the local file path.

#### Scenario: Projection fallback and sanitization stay deterministic

- **WHEN** a file key is empty or contains non-segment characters
- **THEN** the mapping module SHALL sanitize the key into a safe path segment with the existing `file` fallback
- **AND** a local path with no basename SHALL project to `upload.bin`.

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

### Requirement: Sequence step skill runs remain externally traceable

Workflow runtime projections SHALL preserve enough sequence metadata for Host Bridge to expose each concrete sequence step as a skill run.

#### Scenario: Sequence step projection includes identifiers
- **WHEN** a sequence workflow launches a concrete step
- **THEN** task and run projections SHALL retain the parent workflow run id, sequence step id, sequence step index, job id, backend id, request id when known, and opaque skill run handle source.

#### Scenario: Host Bridge can classify sequence roles
- **WHEN** Host Bridge builds a workflow run status from sequence projections
- **THEN** it SHALL classify sequence skill runs as step-level projections rather than treating the parent workflow run id as the executable skill run handle.

### Requirement: Workflow skills use canonical Host Bridge CLI commands

Workflow skill packages that call Host Bridge CLI SHALL use the canonical CLI
surface generated for the current minor version.

#### Scenario: Runtime-owned CLI argv uses canonical namespace
- **WHEN** topic synthesis or literature deep-reading runtime scripts invoke
  `zotero-bridge`
- **THEN** the argv SHALL use canonical groups such as `synthesis topic`,
  `synthesis graph`, `synthesis resolver`, and `synthesis artifact`
- **AND** the runtime SHALL NOT invoke removed top-level groups such as
  `topics`, `citation-graph`, `resolvers`, or `paper-artifacts`.

#### Scenario: Skill instructions show current-state CLI examples
- **WHEN** built-in workflow skills or profile skills include Host Bridge CLI
  examples
- **THEN** examples SHALL use canonical commands
- **AND** instructions SHALL NOT include backward-compatibility notes for
  removed legacy CLI commands.

### Requirement: ACP sequence step cleanup SHALL form a downstream dispatch barrier

Workflow execution SHALL finish successful non-final ACP sequence-step lifecycle cleanup after optional step result apply and before dispatching a later sequence step.

#### Scenario: Intermediate step without apply result settles before continuation
- **GIVEN** a non-final ACP sequence step does not declare `apply_result`
- **WHEN** the step succeeds
- **THEN** Host SHALL settle and detach that step's local controller before starting the next step
- **AND** apply-result state persistence SHALL NOT independently start controller cleanup.

#### Scenario: Intermediate step with apply result settles after apply
- **GIVEN** a non-final ACP sequence step declares `apply_result`
- **WHEN** the backend succeeds and the declared apply completes
- **THEN** Host SHALL settle and detach the controller after apply and before starting the next step.

#### Scenario: Short-circuit step settles before sequence return
- **WHEN** a successful ACP sequence step matches a declared short-circuit rule
- **THEN** Host SHALL complete that step's required controller cleanup before returning the short-circuit result.

#### Scenario: Cleanup and downstream initialization do not overlap
- **WHEN** controller detach for a completed non-final ACP sequence step remains pending
- **THEN** Host SHALL NOT dispatch or initialize the next sequence step until the detach operation settles.

### Requirement: Workflow trace ownership uses the canonical top-level execution

When Workflow semantic trace capture is armed, `runWorkflowExecutionSeam` SHALL use canonical `runState.runId` as the only eligible recording root and SHALL propagate a transient parent recording context to concrete ordinary and sequence ACP requests. Request, job, sequence, and Host Bridge identifiers SHALL NOT substitute for or replace that root.

#### Scenario: Multi-job execution runs
- **WHEN** one top-level execution dispatches multiple concurrent or serial ACP requests
- **THEN** every request activity SHALL belong to one root identified by `runState.runId`.

#### Scenario: Sequence execution runs
- **WHEN** multiple concrete ACP sequence stages execute
- **THEN** all stages SHALL share the parent workflow recording root
- **AND** their existing composite run and Host Bridge identities SHALL remain unchanged.

### Requirement: Workflow trace completion follows execution idle

Only a new top-level execution containing at least one executable ACP request SHALL claim an armed Workflow recording. Concrete request terminals SHALL close their own registered activities but SHALL NOT infer root completion. The execution SHALL aggregate succeeded, failed, or canceled outcome after all jobs and requests settle, finish the unique root, and freeze capture before the business apply seam continues.

#### Scenario: Execution has no ACP request
- **WHEN** preparation halts or a workflow contains no executable ACP request
- **THEN** it SHALL NOT claim the armed recorder.

#### Scenario: Recovered request is reconciled
- **WHEN** startup or historical request recovery publishes lifecycle state
- **THEN** it SHALL NOT claim a newly armed recorder.

#### Scenario: A request fails
- **WHEN** all execution activity is closed and the aggregate business outcome is failed or canceled
- **THEN** the trace MAY still be capture-complete
- **AND** its root end SHALL preserve that business outcome.

### Requirement: Parameter-dependent artifact exclusions SHALL be execution-only

A declarative `artifact-exists` exclusion that names a workflow `parameter`
MUST NOT participate in menu or diagnostic availability filtering. It MUST be
evaluated during execute-mode selection validation using the user's confirmed
workflow parameters.

#### Scenario: Persisted parameter target already exists

- **WHEN** an artifact exists for the persisted or default value of a parameter-dependent exclusion
- **AND** menu or diagnostic availability is evaluated
- **THEN** the exclusion SHALL NOT disable the workflow or remove the source unit

#### Scenario: Confirmed parameter target already exists

- **WHEN** execute-mode validation resolves an existing artifact from the confirmed parameter value
- **THEN** the matching source unit SHALL be counted as skipped
- **AND** request construction and provider submission SHALL NOT occur for that unit

#### Scenario: Artifact exists for a different parameter value

- **WHEN** an artifact exists for parameter value A
- **AND** execute-mode validation is confirmed with parameter value B whose target artifact does not exist
- **THEN** the source unit SHALL remain executable

#### Scenario: Mixed execution batch contains matching and non-matching units

- **WHEN** a confirmed parameter-dependent exclusion matches only some selected source units
- **THEN** matching units SHALL be counted as skipped
- **AND** non-matching units SHALL continue to request construction

#### Scenario: Every execution unit is skipped

- **WHEN** a confirmed parameter-dependent exclusion matches every selected source unit
- **THEN** execute-mode validation SHALL produce zero valid units with the existing no-valid-input outcome
- **AND** its statistics SHALL preserve the skipped-unit count

### Requirement: Static artifact exclusions SHALL preserve availability behavior

An `artifact-exists` exclusion without `parameter` MUST retain its existing
menu, diagnostic, and execute-mode filtering behavior.

#### Scenario: Static target exists during menu evaluation

- **WHEN** menu availability evaluates a parameter-independent artifact target that already exists
- **THEN** the matching source unit SHALL be excluded according to the existing rule

#### Scenario: Static target does not exist

- **WHEN** a parameter-independent artifact target does not exist
- **THEN** the source unit SHALL retain its existing availability and execute eligibility

### Requirement: Artifact target parameter declarations SHALL be authoritative

When an artifact target path depends on a workflow parameter, the manifest MUST
declare that parameter. Target resolution MUST read the confirmed value using
`rule.parameter` and MUST NOT infer the parameter name from a workflow id,
target kind, parameter value, locale, or persisted default.

#### Scenario: Explicit parameter declaration is evaluated

- **WHEN** execute-mode validation evaluates a parameter-dependent artifact exclusion
- **THEN** it SHALL resolve the target from `workflowParams[rule.parameter]`

#### Scenario: Parameterized target omits its parameter declaration

- **WHEN** a workflow manifest declares a target kind that requires a workflow parameter but omits `parameter`
- **THEN** manifest validation SHALL reject the ambiguous rule

### Requirement: Confirmed prepared units SHALL be execution truth
The runtime SHALL execute units from one confirmed workflow input plan and SHALL NOT rerun raw selection or candidate cardinality validation while building an individual unit.

#### Scenario: Each unit follows a multi-parent admission requirement
- **WHEN** a confirmed plan satisfying `parents.min: 2` emits multiple one-parent units
- **THEN** every admitted unit can build and run without failing the original multi-parent requirement

### Requirement: Preflight expansion SHALL stay inside a top-level unit
Preflight SHALL run after grouping and MAY replace or expand provider requests inside one prepared unit, but SHALL NOT alter top-level unit count or consume additional Host concurrency slots.

#### Scenario: Preflight produces multiple requests
- **WHEN** preflight expands one prepared unit into multiple provider requests
- **THEN** the queue and concurrency model continue to count one top-level unit

### Requirement: Execution summaries SHALL distinguish candidate and unit outcomes
Candidate exclusions before grouping SHALL be reported as candidate skips; duplicate refusal, queued cancellation, preflight skip, and other top-level results SHALL be reported as unit skips; success and failure SHALL count only top-level units.

#### Scenario: Filter removes one member and duplicate guard rejects one group
- **WHEN** candidate filtering removes one member and duplicate confirmation rejects a later prepared unit
- **THEN** the summary records one candidate skip and one unit skip without counting either as success or failure

### Requirement: Admission SHALL prevent later regrouping
After a prepared unit is admitted, selection-count changes, candidate-count changes, peer state, or stale source files SHALL NOT cause the runtime to reconstruct or repartition the batch.

#### Scenario: Source becomes stale after admission
- **WHEN** one admitted unit's source disappears before build
- **THEN** only that unit's build/run outcome changes and peer units retain their original membership

### Requirement: Successful sequence-step advancement SHALL be shared

Workflow execution SHALL use one sequence-runtime transition for a successful
step regardless of whether success returns from foreground provider execution
or is accepted later from an external completion owner.

#### Scenario: Normal and external success use the same advancement policy

- **WHEN** a normal or externally completed sequence step succeeds
- **THEN** Host SHALL persist step success before optional step apply
- **AND** it SHALL settle the configured lifecycle barrier before
  short-circuit return or downstream dispatch
- **AND** it SHALL use the same final, short-circuit, and continuation rules.

#### Scenario: Apply failure continues by policy

- **WHEN** step execution succeeds
- **AND** step apply fails with `on_failure: "continue"`
- **THEN** Host SHALL preserve the successful step status and failed apply
  status
- **AND** it SHALL settle the lifecycle barrier before continuing.

#### Scenario: Apply failure stops by policy

- **WHEN** step execution succeeds
- **AND** step apply fails with `on_failure: "fail_sequence"`
- **THEN** Host SHALL preserve the successful step status and failed apply
  status
- **AND** it SHALL fail the root without dispatching a downstream step.

### Requirement: External step completion SHALL be idempotent from persisted state

The sequence runtime SHALL accept repeated external completion observations
without repeating already completed advancement phases.

#### Scenario: Repeated completion resumes incomplete work

- **WHEN** the same sequence step index and request id are accepted again
- **THEN** Host SHALL skip persisted successful phases
- **AND** it MAY resume an incomplete step apply, lifecycle settlement, root
  terminalization, or downstream continuation.

#### Scenario: Persisted downstream request is not duplicated

- **WHEN** a later step already has a persisted backend request id
- **THEN** repeated completion of its predecessor SHALL NOT dispatch that later
  step again.

#### Scenario: Bound request identity conflicts

- **WHEN** a step is already bound to one request id
- **AND** external completion presents a different request id for that step
- **THEN** Host SHALL reject the completion as a state conflict
- **AND** it SHALL NOT overwrite the persisted request identity.

#### Scenario: Terminal root remains terminal

- **WHEN** repeated completion is accepted after the sequence root is
  completed, failed, or canceled
- **THEN** Host SHALL NOT return the root to a running or continuing state.

### Requirement: Sequence lifecycle cleanup SHALL use an explicit adapter

The generic sequence runtime SHALL own lifecycle cleanup ordering while
backend-specific cleanup operations remain behind an injected adapter.

#### Scenario: Step apply has no hidden controller cleanup

- **WHEN** a sequence step apply succeeds or fails
- **THEN** apply execution SHALL only return or throw its business outcome
- **AND** controller settlement SHALL occur through the runtime-owned lifecycle
  adapter boundary.

#### Scenario: ACP cleanup failure preserves business state

- **WHEN** ACP controller detach reports a transport cleanup failure
- **THEN** Host SHALL keep the settled step execution and apply facts
- **AND** it SHALL expose the cleanup warning under the existing recoverable
  ACP detach contract.
