# acp-skillrunner-compatible-runner Specification

## Purpose
TBD - created by archiving change add-acp-skillrunner-compatible-runner. Update Purpose after archive.
## Requirements
### Requirement: ACP backend SHALL execute SkillRunner-compatible workflow jobs

The system SHALL allow `skillrunner.job.v1` workflow requests to execute through
an ACP backend without changing the workflow-facing request contract, when the
workflow's provider-derived backend compatibility allows an ACP backend.
`request.kind` alone SHALL NOT make ACP or SkillRunner backends compatible.
The ACP execution path SHALL use shared platform command and path services when
preparing local workspaces, Host Bridge CLI injection, dependency wrappers, and
backend launch commands.

#### Scenario: ACP backend dispatches skillrunner job

- **GIVEN** a workflow-compatible backend with `type: "acp"`
- **AND** a request with `kind: "skillrunner.job.v1"`
- **AND** the workflow provider permits ACP backend execution
- **WHEN** provider dispatch resolves the request
- **THEN** it SHALL route to the ACP provider workflow runner path
- **AND** ACP chat `acp.prompt.v1` behavior SHALL remain unchanged

#### Scenario: Request kind alone does not permit ACP bridge

- **GIVEN** a workflow request with `kind: "skillrunner.job.v1"`
- **AND** the workflow provider does not permit ACP backend execution
- **WHEN** backend compatibility is resolved
- **THEN** ACP backend profiles SHALL NOT be considered compatible solely
  because of the request kind.

#### Scenario: ACP backend command runs on Windows

- **GIVEN** a Windows ACP backend command currently resolves through `npx.cmd`,
  PowerShell, cmd, or a user-local executable
- **WHEN** the platform services migration is applied
- **THEN** the command line, arguments, and PATH injection behavior SHALL remain
  equivalent.

#### Scenario: ACP backend command runs from a GUI Linux runtime

- **GIVEN** Zotero is launched without a login-shell PATH
- **WHEN** ACP execution launches a backend command such as `npx`
- **THEN** the command resolver SHALL use shared non-interactive lookup
  candidates before reporting failure.

### Requirement: ACP runner SHALL materialize skills into agent-specific roots

The ACP runner SHALL materialize plugin-side skills into run-local skill roots
selected by ACP agent family, except for ACP families that use catalog-based
instruction discovery.

#### Scenario: Hermes uses catalog-based skill discovery

- **GIVEN** an ACP backend resolved as `hermes`
- **WHEN** the runner prepares an ACP Skills run
- **THEN** it SHALL build or reuse the shared skill catalog
- **AND** it SHALL NOT materialize thin proxy skills into project-level skill
  roots
- **AND** it SHALL keep the requested skill's catalog root available for
  execution and validation.

### Requirement: ACP runner SHALL recognize Kilo as a project-skill-root agent family

ACP agent family resolution SHALL treat Kilo as a known project-skill-root family. Kilo's default project skill root SHALL be `.kilo/skills`.

#### Scenario: Kilo backend resolves to Kilo family

- **GIVEN** an ACP backend is explicitly configured as `kilo` or is inferred from Kilo command metadata
- **WHEN** ACP agent family resolution runs
- **THEN** the resolved family SHALL be `kilo`
- **AND** the default skill roots SHALL include `.kilo/skills`.

#### Scenario: Kilo preset uses Kilo family

- **WHEN** the Kilo ACP preset is converted into a backend profile
- **THEN** the backend profile SHALL set `acp.agentFamily` to `kilo`.

### Requirement: ACP runner SHALL wrap workflow launches with uv when needed

The ACP runner SHALL use `uv run --with` only for workflow-run ACP launches when
the materialized skill declares runtime Python dependencies and startup command
resolution found uv available. If startup command resolution did not find uv but
did find Python, the runner MAY use the original backend command only after
verifying the declared dependencies are already available in that Python
environment. ACP backends resolved as `hermes` SHALL keep the configured backend
command unchanged because Hermes owns its own Python runtime.

#### Scenario: Chat launch is unaffected
- **GIVEN** a skill declares `runtime.dependencies`
- **WHEN** the user starts normal ACP chat
- **THEN** the configured backend command and args SHALL be used unchanged
- **AND** ACP chat SHALL NOT require uv or Python to be available.

#### Scenario: Workflow launch is wrapped through uv
- **GIVEN** a skill declares `runtime.dependencies`
- **AND** startup command resolution found uv available
- **AND** the per-job uv dependency probe succeeds
- **AND** the ACP backend is not resolved as `hermes`
- **WHEN** the workflow runner launches the ACP process
- **THEN** it SHALL wrap the command with `uv run --with ... --`.

#### Scenario: Hermes workflow launch bypasses uv backend wrapping
- **GIVEN** a skill declares `runtime.dependencies`
- **AND** startup command resolution found uv available
- **AND** the per-job uv dependency probe succeeds
- **AND** the ACP backend resolves as `hermes`
- **WHEN** the workflow runner launches the ACP process
- **THEN** it SHALL use the configured Hermes backend command unchanged
- **AND** it SHALL report that runtime dependency backend wrapping was bypassed for Hermes.

#### Scenario: uv dependency preparation failure does not fall back
- **GIVEN** a skill declares `runtime.dependencies`
- **AND** startup command resolution found uv available
- **AND** the per-job uv dependency probe fails
- **WHEN** the workflow runner resolves runtime dependencies
- **THEN** the run SHALL fail with readiness `uv_dependency_resolution_failed`
- **AND** it SHALL NOT fall back to system Python.

#### Scenario: System Python fallback succeeds
- **GIVEN** a skill declares `runtime.dependencies`
- **AND** startup command resolution did not find uv available
- **AND** startup command resolution found Python available
- **AND** the per-job Python dependency probe verifies the declared dependencies
- **WHEN** the workflow runner launches the ACP process
- **THEN** it SHALL use the configured backend command unchanged.

#### Scenario: System Python fallback misses dependencies
- **GIVEN** a skill declares `runtime.dependencies`
- **AND** startup command resolution did not find uv available
- **AND** startup command resolution found Python available
- **AND** the per-job Python dependency probe cannot verify the declared
  dependencies
- **WHEN** the workflow runner resolves runtime dependencies
- **THEN** the run SHALL fail with readiness
  `system_python_dependencies_missing`.

#### Scenario: No dependency strategy is available
- **GIVEN** a skill declares `runtime.dependencies`
- **AND** startup command resolution found neither uv nor Python available
- **WHEN** the workflow runner resolves runtime dependencies
- **THEN** the run SHALL fail with readiness
  `runtime_dependency_strategy_unavailable`.

### Requirement: ACP runner SHALL validate structured output and repair failures

The ACP runner SHALL validate assistant turn output and issue bounded repair
prompts when validation fails.

#### Scenario: Hermes initial prompt uses HERMES instructions

- **GIVEN** an ACP Skills run is created for a SkillRunner-compatible job
- **AND** the ACP backend resolves as `hermes`
- **WHEN** the run workspace is prepared
- **THEN** ACP Skills SHALL materialize `HERMES.md`
- **AND** `HERMES.md` SHALL identify the current requested Agent Skill
- **AND** `HERMES.md` SHALL list available Agent Skills with ID, description,
  and catalog skill root
- **AND** the first prompt SHALL include compact catalog context rather than
  proxy skill roots.

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

### Requirement: ACP SkillRunner-compatible runs SHALL use the ACP Skills run-status state machine as SSOT

ACP SkillRunner-compatible runs SHALL use `queued`, `running`, `waiting_user`,
`repairing`, `failed_retriable`, `succeeded`, `failed`, and `canceled` as the ACP
Skills run status domain. `succeeded`, `failed`, and `canceled` SHALL be
terminal absorbing statuses. `failed_retriable` SHALL be a non-terminal active
and recoverable status, not a `JobState` expansion.

#### Scenario: Recoverable prompt failure enters failed retriable

- **GIVEN** an ACP SkillRunner-compatible run has an established `sessionId`
- **AND** the session recovery state is `available`, `connected`, `connecting`,
  or otherwise retryable by the ACP Skills recovery contract
- **WHEN** a prompt/session failure occurs before the run reaches a terminal
  outcome
- **THEN** the ACP Skills run status SHALL become `failed_retriable`
- **AND** the run SHALL remain visible in active ACP summaries
- **AND** reconnect and cancel task actions SHALL remain available.

#### Scenario: Non-recoverable prompt failure enters terminal failed

- **GIVEN** an ACP SkillRunner-compatible run has no recoverable ACP session
- **WHEN** a prompt/session failure occurs
- **THEN** the ACP Skills run status SHALL become terminal `failed`
- **AND** reply, recovery, apply, and sequence continuation paths SHALL NOT
  transition that run back to a non-terminal status.

#### Scenario: Terminal statuses are absorbing

- **GIVEN** an ACP Skills run status is `succeeded`, `failed`, or `canceled`
- **WHEN** a later reply, reconnect, apply result, workflow projection, or
  sequence continuation path observes the run
- **THEN** the main run status SHALL remain unchanged
- **AND** any unsupported action SHALL be rejected or recorded without reviving
  the terminal run.

#### Scenario: Legacy recoverable failed record is normalized

- **GIVEN** a persisted ACP Skills run has status `failed`
- **AND** it is not archived or removed
- **AND** it has a `sessionId`
- **AND** its conversation and recovery axes describe a retryable detached or
  connected session
- **WHEN** ACP Skills hydrates or normalizes the record
- **THEN** the run status SHALL be normalized to `failed_retriable`
- **AND** unrecoverable or unsupported failed records SHALL remain terminal
  `failed`.

#### Scenario: Reply continuation re-enters running

- **GIVEN** a non-terminal ACP Skills run is `waiting_user` or
  `failed_retriable`
- **WHEN** an accepted reply starts a continuation prompt
- **THEN** the main run status SHALL transition to `running` with an explicit
  continuation reason
- **AND** `activePrompt` SHALL be `true`
- **AND** `replyState` SHALL remain an independent acknowledgement axis rather
  than substitute for the main run status
- **AND** prompt completion or failure SHALL leave `running` through a valid
  state-machine transition.

### Requirement: ACP skills active task projections SHALL use ACP status classifiers

ACP Skills SHALL classify dashboard, toolbar, run drawer, workflow task sync,
and Host Bridge active task liveness through the shared ACP status helpers.
`failed_retriable` SHALL be visible as active/recoverable. Terminal
`succeeded`, `failed`, and `canceled` SHALL be excluded from active task lists
unless a view explicitly requests history.

#### Scenario: Failed retriable remains active

- **GIVEN** an ACP Skills run has status `failed_retriable`
- **WHEN** dashboard, toolbar, ACP panel, or Host Bridge active task summaries
  are computed
- **THEN** the run SHALL remain visible as an active or actionable task
- **AND** the summary SHALL expose connect and cancel task affordances when the
  recovery/session axes allow them.

#### Scenario: Terminal failed is not active

- **GIVEN** an ACP Skills run has terminal status `failed`
- **WHEN** active task summaries are computed
- **THEN** the run SHALL be excluded from active lists
- **AND** it SHALL NOT be offered as an auto-continuation candidate.

#### Scenario: Workflow task state does not expand

- **GIVEN** an ACP Skills run has status `failed_retriable`
- **WHEN** the run is projected into workflow task rows or Host Bridge active
  task handles
- **THEN** the projection SHALL use existing workflow task states such as
  `running` or `waiting_user`
- **AND** recoverability SHALL be expressed through ACP summary status,
  liveness, and action flags.

### Requirement: ACP SkillRunner-compatible runs SHALL validate ACP status transitions at write boundaries

ACP Skills SHALL centralize status classification and transition validation in
the run store. Production code that writes a new status SHALL provide an
explicit transition reason. Invalid transitions SHALL fail at the write
boundary instead of being silently projected into later UI or recovery state.

#### Scenario: Production status write includes reason

- **WHEN** production ACP Skills code changes a run's main status
- **THEN** the write SHALL include a status transition reason
- **AND** the store SHALL validate the transition against the ACP Skills
  state-machine contract.

#### Scenario: Invalid terminal revival is rejected

- **GIVEN** an ACP Skills run has terminal status `succeeded`, `failed`, or
  `canceled`
- **WHEN** production code attempts to write `running`, `waiting_user`,
  `repairing`, or `failed_retriable`
- **THEN** the store SHALL reject the transition.

#### Scenario: Test fixtures can construct historical states

- **WHEN** tests need to represent persisted historical or intentionally invalid
  state
- **THEN** they MAY use dedicated fixture helpers
- **AND** production transition validation SHALL remain strict.

### Requirement: ACP skill runner MUST execute ACP skill run requests

ACP skill execution SHALL use `acp.skill.run.v1` as its provider-facing request
contract. The runner MUST reject `skillrunner.job.v1` at its public dispatch
boundary. The runner MUST synthesize effective runtime options from the skill
runner manifest defaults, request payload runtime options, and submit-time
provider runtime options without mutating the submitted request payload.

#### Scenario: Input manifest uses local paths

- **WHEN** an ACP skill run is created from a workflow with upload-derived input
- **THEN** the run input manifest SHALL contain local absolute file paths
- **AND** it SHALL NOT expose `inputs/<key>/...` upload-relative paths to the
  agent.

#### Scenario: Runtime defaults are synthesized for ACP execution

- **GIVEN** an ACP skill run request omits `runtime_options.hard_timeout_seconds`
- **AND** the skill runner manifest declares `runtime.default_options.hard_timeout_seconds`
- **WHEN** ACP execution starts
- **THEN** the effective runtime options SHALL use the manifest timeout value
- **AND** the submitted request runtime options SHALL remain unchanged.

#### Scenario: Request runtime options override manifest defaults

- **GIVEN** an ACP skill run request declares `runtime_options.hard_timeout_seconds`
- **AND** the skill runner manifest also declares a hard timeout default
- **WHEN** ACP execution starts
- **THEN** the effective runtime options SHALL use the request timeout value.

#### Scenario: Submit-time provider runtime options override request payload

- **GIVEN** an ACP skill run request declares `runtime_options.hard_timeout_seconds`
- **AND** the selected workflow execution context declares provider option
  `hard_timeout_seconds`
- **WHEN** ACP execution starts
- **THEN** the effective runtime options SHALL use the provider option timeout
  value.

#### Scenario: Missing timeout falls back to 1200 seconds

- **GIVEN** neither the request nor the skill runner manifest declares a valid hard timeout
- **WHEN** ACP execution starts
- **THEN** the effective runtime options SHALL use `1200` seconds.

### Requirement: ACP skill runner MUST disconnect recoverably on hard timeout

ACP skill execution SHALL apply `hard_timeout_seconds` as a local ACP connection
guard. Timeout expiry MUST disconnect the local ACP connection through existing
recoverable disconnect semantics, MUST NOT introduce a new terminal run state,
and MUST NOT mark the run as `failed` or `canceled`.

#### Scenario: Initial session setup is not counted as agent execution time

- **GIVEN** an ACP skill run is creating or configuring an ACP session
- **WHEN** session setup has not yet reached the first ACP prompt call
- **THEN** hard timeout monitoring SHALL NOT start
- **AND** the first timeout window SHALL start only after the prompt turn is
  ready to be sent to the ACP session.

#### Scenario: Auto run timeout disconnects without failing the run

- **GIVEN** an auto ACP skill run has an active prompt turn
- **WHEN** the effective hard timeout expires
- **THEN** the runner SHALL record a `hard-timeout-disconnect-requested` event
- **AND** it SHALL attempt to cancel the active ACP prompt
- **AND** it SHALL drain already-arrived transcript updates for a bounded local
  window
- **AND** it SHALL close any open streaming transcript item before appending the
  timeout notice
- **AND** it SHALL append a localized system status transcript item explaining
  the timeout disconnect
- **AND** it SHALL close the local ACP connection
- **AND** the run SHALL remain recoverable
- **AND** the run status SHALL NOT become `failed` or `canceled`.

#### Scenario: Timeout notice follows drained transcript content

- **GIVEN** transcript text has already arrived locally when hard timeout
  disconnect starts
- **WHEN** the runner completes the hard timeout disconnect transcript handling
- **THEN** visible transcript content SHALL be finalized before the timeout
  status item is appended
- **AND** the timeout status item SHALL appear after the drained agent
  transcript content.

#### Scenario: Interactive waiting clears timeout monitoring

- **GIVEN** an interactive ACP skill run reaches `waiting_user`
- **WHEN** the run waits for a user reply
- **THEN** hard timeout monitoring SHALL be stopped for that waiting period
- **AND** a later user reply SHALL start a fresh hard timeout window for the
  next agent turn.

#### Scenario: Permission waiting pauses timeout monitoring

- **GIVEN** an ACP skill run has an active prompt turn
- **WHEN** the ACP backend requests user permission
- **THEN** hard timeout monitoring SHALL be paused while the permission request
  is pending
- **AND** resolving, cancelling, or auto-approving the permission request SHALL
  restart a fresh hard timeout window for the still active agent turn
- **AND** this SHALL NOT introduce a new run status or change the remote ACP
  session lifecycle.

#### Scenario: Recovered session reapplies timeout monitoring

- **GIVEN** an ACP skill run is reconnected through session recovery
- **WHEN** a recovered agent turn starts
- **THEN** the runner SHALL recompute effective runtime options
- **AND** it SHALL apply hard timeout monitoring to that recovered turn.

#### Scenario: Recoverable disconnect preserves the current main status

- **GIVEN** an ACP skill run is `running`, `waiting_user`, `repairing`, or
  `failed_retriable`
- **WHEN** hard timeout or recoverable disconnect detaches the local controller
  without terminal cancellation
- **THEN** the ACP Skills run status SHALL remain in the same main state
- **AND** the conversation/recovery axes SHALL express whether reconnect or user
  reply is required.

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

### Requirement: ACP Skills selected composer is isolated from other run updates

ACP Skills SHALL preserve the selected run's active composer while unrelated
runs stream, reconnect, or refresh.

#### Scenario: Other run streams while selected run is waiting

- **WHEN** the selected ACP Skills run is waiting for user open-text input
- **AND** another run receives streaming output or status updates
- **THEN** the selected run's textarea SHALL remain the same DOM node
- **AND** its draft, focus, selection, and enabled state SHALL be preserved.

#### Scenario: Terminal run with reply availability remains usable

- **WHEN** a failed, canceled, or completed run still has an available
  conversation reply path
- **THEN** reconnect or snapshot refresh SHALL NOT force the composer into a
  disabled completed-only state.

### Requirement: ACP Skills refresh hardening preserves prompt semantics

ACP Skills SHALL preserve existing prompt interaction semantics while hardening
refresh behavior.

#### Scenario: Choice and permission prompts stay button-first

- **WHEN** a selected run has choice options or a permission request
- **THEN** the corresponding buttons SHALL remain operable after snapshot
  refresh
- **AND** text input SHALL NOT become the only available reply path.

### Requirement: ACP skill replies SHALL recover from failed prompt chains

ACP skill run replies SHALL NOT reuse a previously rejected prompt-chain promise
as the starting point for a later user reply.

#### Scenario: Reply after recovered prompt failure starts a new turn

- **GIVEN** an ACP skill run was recovered from an existing session
- **AND** a recovered continuation prompt failed and rejected its prompt chain
- **WHEN** the user sends a later reply to the same run
- **THEN** the runner SHALL start a new ACP prompt turn for that reply
- **AND** it SHALL NOT immediately fail by replaying the previous prompt-chain rejection.

#### Scenario: Failed turn records diagnostics without poisoning state

- **GIVEN** an ACP skill run prompt turn fails
- **WHEN** the runner records the failure
- **THEN** it SHALL retain diagnostics for the failed turn
- **AND** it SHALL clear or replace the mutable prompt-chain state before accepting another reply.

### Requirement: ACP runner SHALL resolve Skill Runner schema assets consistently

The ACP runner SHALL resolve `input`, `parameter`, and `output` schema assets using Skill Runner-compatible rules: declared `runner.schemas.<key>` first, then `assets/<key>.schema.json` fallback.

#### Scenario: Default output schema is used

- **WHEN** a skill omits `runner.schemas.output`
- **AND** `assets/output.schema.json` exists
- **THEN** ACP output validation SHALL validate final output against that default schema.

#### Scenario: Declared schema falls back

- **WHEN** a declared schema path is empty, absolute, escapes the skill root, or does not exist
- **AND** `assets/<key>.schema.json` exists
- **THEN** ACP SHALL use the default schema path for that key.

#### Scenario: Missing schema fails validation when required

- **WHEN** ACP needs to validate output
- **AND** neither the declared output schema nor `assets/output.schema.json` can be resolved
- **THEN** output validation SHALL fail with a schema diagnostic instead of silently passing.

### Requirement: ACP runner SHALL validate request input and parameter schemas

The ACP runner SHALL validate request `input` and `parameter` payloads before sending the first ACP prompt.

#### Scenario: Host-local file input is accepted

- **WHEN** an input schema key has `x-input-source=file` or no `x-input-source`
- **AND** the ACP request provides an existing absolute local path for that key
- **THEN** ACP SHALL include that path in the prompt input context.

#### Scenario: Invalid file input is rejected

- **WHEN** a file input is missing, relative, upload-relative, or points to a non-existing local file
- **THEN** ACP SHALL fail the run before prompting the agent with input validation diagnostics.

#### Scenario: Inline input and parameter are schema validated

- **WHEN** input keys marked `x-input-source=inline` or parameter keys are present
- **THEN** ACP SHALL validate them against their corresponding JSON schemas.

### Requirement: ACP runner SHALL render Skill Runner entrypoint prompts

The ACP runner SHALL render `runner.entrypoint.prompts.<engine>` when available, fall back to `common`, and only use the generic ACP prompt when no runner prompt is defined.

#### Scenario: Engine prompt takes precedence

- **WHEN** a runner defines both an engine-specific prompt and a common prompt
- **THEN** ACP SHALL render the prompt matching the resolved ACP agent family.

#### Scenario: Common prompt is rendered

- **WHEN** no engine-specific prompt exists
- **AND** `runner.entrypoint.prompts.common` exists
- **THEN** ACP SHALL render the common prompt with resolved `input`, `parameter`, `skill`, `run_dir`, and `engine_id` variables.

### Requirement: ACP runner SHALL recover valid package result files

The ACP runner SHALL attempt package result-file fallback when assistant output is invalid before exhausting repair/failure handling.

#### Scenario: Default result file recovers output

- **WHEN** assistant output is invalid
- **AND** the run workspace contains a valid `${skill_id}.result.json` outside `result/` and `.acp/`
- **THEN** ACP SHALL validate that file against the output schema and use it as the final result.

#### Scenario: Declared result file name is used

- **WHEN** `runner.entrypoint.result_json_filename` is declared
- **THEN** ACP SHALL use that filename instead of `${skill_id}.result.json` for fallback discovery.

#### Scenario: Invalid result file does not bypass repair

- **WHEN** a fallback result file is missing, invalid JSON, non-object, or schema invalid
- **THEN** ACP SHALL continue normal invalid-output repair or failure handling.

### Requirement: ACP runner SHALL preserve declared compatibility divergences

ACP Skills SHALL preserve its documented runtime divergences from Skill Runner.

#### Scenario: No target output schema is generated

- **WHEN** an ACP Skills run is prepared
- **THEN** ACP SHALL NOT generate `.acp/contracts/target_output_schema.json`
- **AND** it SHALL NOT pass active structured-output schema options to the ACP backend.

#### Scenario: Artifact paths are not rewritten

- **WHEN** final output contains schema fields annotated with `x-type=artifact` or `x-type=file`
- **THEN** ACP SHALL NOT rewrite those fields to bundle-relative paths.

### Requirement: ACP Skill runs SHALL optionally auto-approve ACP tool permissions

ACP Skill runs SHALL automatically resolve ACP backend tool-call permission
requests only when the run's frozen ACP provider options enable permission
auto-approval. Auto-approved ACP tool-call permission requests SHALL preserve
the normal permission audit trail without publishing a pending user-action
state.

#### Scenario: ACP allow-once option is selected

- **GIVEN** an ACP Skill run has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission with an ACP-standard
  `kind: "allow_once"` option
- **THEN** the run SHALL resolve the permission with that option
- **AND** the transcript SHALL retain the normal permission audit item
- **AND** the run SHALL NOT publish `pendingPermission` for that request
- **AND** the workspace UI SHALL NOT emit a waiting-user toast for that
  permission request.

#### Scenario: Allow once is preferred over allow always

- **GIVEN** an ACP Skill run has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission with both ACP-standard
  `kind: "allow_always"` and `kind: "allow_once"` options
- **THEN** the run SHALL resolve the permission with the first `allow_once`
  option
- **AND** the run SHALL NOT publish `pendingPermission` for that request.

#### Scenario: Allow always option is selected when no allow once exists

- **GIVEN** an ACP Skill run has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission with an ACP-standard
  `kind: "allow_always"` option and no `allow_once` option
- **THEN** the run SHALL resolve the permission with the first `allow_always`
  option
- **AND** the run SHALL NOT publish `pendingPermission` for that request.

#### Scenario: Non-standard or non-allow requests remain manual

- **GIVEN** an ACP Skill run has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission without an ACP-standard
  `kind: "allow_once"` or `kind: "allow_always"` option
- **THEN** the run SHALL keep the permission pending for manual user action.

#### Scenario: Other permission channels are unaffected

- **GIVEN** an ACP Skill run has `autoApproveAcpPermissions: true`
- **WHEN** a permission request source is not `acp-tool-call`
- **THEN** the run SHALL NOT auto-approve that request.

### Requirement: ACP Skills controls distinguish turn, connection, and task cancellation

ACP Skills SHALL treat current-turn cancel, connection disconnect, and task
cancel as separate user actions with separate state transitions.

#### Scenario: Current turn cancel stops only the active prompt

- **WHEN** the user cancels the current ACP Skills prompt turn
- **THEN** Host SHALL stop the active ACP prompt call
- **AND** the run SHALL remain non-terminal
- **AND** the ACP connection SHALL remain available for later prompts
- **AND** assistant text returned after the cancel SHALL NOT enter output
  validation, result-file fallback, or output repair.

#### Scenario: Disconnect stops the turn before detaching

- **WHEN** the user disconnects an ACP Skills run during an active prompt turn
- **THEN** Host SHALL stop the active prompt turn before detaching the local
  connection
- **AND** the run SHALL remain non-terminal and recoverable
- **AND** assistant text returned after the disconnect SHALL NOT enter output
  validation, result-file fallback, or output repair.

#### Scenario: Disconnect during pending interaction is deferred

- **GIVEN** an ACP Skills workflow run is waiting for user input
- **AND** the run has a recoverable ACP session
- **WHEN** Zotero shutdown or explicit disconnect detaches the local connection
- **THEN** the provider result SHALL be reported as deferred rather than
  succeeded
- **AND** the run SHALL preserve the pending interaction and recoverable session
- **AND** workflow `applyResult` SHALL NOT run
- **AND** ACP Skills SHALL NOT mark `applyResultState` as succeeded.

#### Scenario: Pending interaction remains recoverable despite stale apply state

- **GIVEN** an ACP Skills workflow run has a pending interaction
- **AND** a stale local record indicates workflow apply already succeeded
- **WHEN** the user reconnects or replies to the recoverable session
- **THEN** ACP Skills SHALL treat the run as a deferred continuation
- **AND** it SHALL NOT block recovery solely because of the stale apply state.

#### Scenario: Task cancel is terminal

- **WHEN** the user cancels the ACP Skills task
- **THEN** Host SHALL stop the active prompt turn and detach the connection
- **AND** the run SHALL become terminal `canceled`
- **AND** any parent sequence SHALL NOT start downstream steps.

### Requirement: ACP SkillRunner prompt failures SHALL bypass output repair

ACP SkillRunner-compatible runs SHALL classify ACP protocol-visible prompt
failures before output validation. These failures SHALL NOT be treated as
SkillRunner output contract failures and SHALL NOT trigger output repair.

#### Scenario: Empty inactive successful turn produces no repair

- **GIVEN** an ACP SkillRunner-compatible run needs structured assistant output
- **WHEN** `session/prompt` returns `end_turn`
- **AND** the prompt turn produced no non-empty assistant message text
- **AND** the plugin observed no ACP `session/update` activity during that
  prompt turn
- **AND** result-file fallback does not recover a valid result
- **THEN** the run SHALL fail with an ACP prompt failure diagnostic
- **AND** it SHALL NOT record output validation failure
- **AND** it SHALL NOT start output repair.

#### Scenario: Empty active successful turn remains output-governed

- **GIVEN** an ACP SkillRunner-compatible run needs structured assistant output
- **WHEN** `session/prompt` returns `end_turn`
- **AND** the prompt turn produced no non-empty assistant message text
- **AND** the plugin observed ACP `session/update` activity during that prompt
  turn
- **THEN** the run SHALL continue through normal result-file fallback and output
  validation
- **AND** invalid or missing structured output SHALL remain eligible for bounded
  output repair.

#### Scenario: Protocol stop reason produces no repair

- **WHEN** `session/prompt` returns `refusal`, `max_tokens`, `max_turn_requests`,
  or a non-user-requested `cancelled`
- **THEN** the run SHALL fail with an ACP prompt stopped diagnostic
- **AND** it SHALL NOT start output repair.

#### Scenario: Protocol request error produces no repair

- **WHEN** the ACP adapter exposes a `session/prompt` request error to the plugin
- **THEN** the run SHALL fail with that plugin-visible prompt error diagnostic
- **AND** it SHALL NOT start output repair.

#### Scenario: Prompt failure remains recoverable when the session is recoverable

- **GIVEN** the ACP run has an established session that can be reattached
- **WHEN** prompt failure governance fails the current prompt chain
- **THEN** the run SHALL become non-terminal `failed_retriable`
- **AND** the conversation SHALL retain recovery information needed to reconnect
- **AND** active ACP summaries SHALL continue to expose the run as recoverable.

#### Scenario: ACP-visible backend prompt error produces no repair

- **WHEN** the ACP adapter exposes a backend prompt error from a JSON-RPC response
  or an explicit prompt-level provider `session/update` extension such as
  `backend_error` or `prompt_error`
- **THEN** the run SHALL fail with that plugin-visible prompt error diagnostic
- **AND** it SHALL NOT start output repair
- **AND** the transcript SHALL include a high-signal ACP prompt failure item.

#### Scenario: Tool failure updates remain output governed

- **WHEN** the ACP backend emits `tool_call` or `tool_call_update` with a failed
  or error status
- **AND** the prompt later returns assistant output
- **THEN** the runner SHALL NOT classify that tool update as an ACP prompt
  lifecycle failure
- **AND** the assistant output SHALL continue through normal output validation,
  apply, or bounded repair.

#### Scenario: Prompt-level provider diagnostic does not override assistant output

- **WHEN** an explicit prompt-level provider diagnostic is observed through
  `session/update`
- **AND** the same prompt turn has produced non-empty assistant text
- **THEN** the runner SHALL continue through normal output validation, apply, or
  bounded repair instead of failing solely on that diagnostic.

#### Scenario: User-interrupted turn does not become output governed

- **GIVEN** the user cancels the current ACP Skills prompt turn
- **WHEN** the backend later completes `session/prompt` with `end_turn`
- **THEN** the runner SHALL record the turn as interrupted
- **AND** it SHALL set the ACP skill run to `status = "waiting_user"`
- **AND** it SHALL clear `activePrompt` and `replyState`
- **AND** it SHALL NOT enter result-file fallback, output validation, or output
  repair
- **AND** the run SHALL remain non-terminal unless the user separately cancels
  the task.

#### Scenario: Task cancel during prompting becomes terminal canceled

- **GIVEN** an ACP Skills run has an active prompt turn
- **WHEN** the user activates task-level `Cancel Task`
- **AND** the adapter later reports `cancelRequested`
- **THEN** the run SHALL settle to terminal `canceled`
- **AND** it SHALL NOT transition to `waiting_user`
- **AND** later user replies SHALL NOT continue that canceled run.

#### Scenario: User-interrupted sequence step does not continue downstream

- **GIVEN** an ACP Skills run is executing as a non-final
  `skillrunner.sequence.v1` step
- **WHEN** the user cancels the current ACP prompt turn
- **THEN** the provider result SHALL be deferred with
  `backendStatus = "waiting_user"`
- **AND** the parent sequence SHALL remain parked on the current step
- **AND** downstream sequence steps SHALL NOT start until the user replies and
  the current step later produces a non-deferred successful result.

#### Scenario: Interrupted connected run becomes user-replyable

- **GIVEN** an ACP Skills run is connected
- **AND** the current prompt turn has been interrupted
- **WHEN** the ACP Skills panel renders the run
- **THEN** the interaction SHALL NOT be shown as agent-working
- **AND** the reply composer SHALL be enabled for normal user reply
- **AND** the current-turn cancel action SHALL NOT be exposed.

### Requirement: ACP skill runs SHALL preserve recoverability after startup

ACP skill run startup reconciliation SHALL preserve recoverable non-terminal runs while clearing non-recoverable stale local executions.

#### Scenario: Recoverable ACP run survives local controller loss

- **GIVEN** an ACP skill run is non-terminal and its conversation recovery state is `available` or `connected`
- **WHEN** startup reconciliation runs after a plugin restart
- **THEN** the run SHALL remain non-terminal and recoverable
- **AND** the associated workflow task projection SHALL NOT be failed solely because the local controller is gone.

#### Scenario: Non-recoverable ACP run is failed after restart

- **GIVEN** an ACP skill run is non-terminal and cannot be recovered
- **WHEN** startup reconciliation runs after a plugin restart
- **THEN** the run SHALL be marked `failed`
- **AND** the associated workflow task projection SHALL leave active task lists.

#### Scenario: Failed retriable ACP run survives startup reconciliation

- **GIVEN** an ACP skill run has status `failed_retriable`
- **AND** its conversation recovery state remains retryable
- **WHEN** startup reconciliation runs after a plugin restart
- **THEN** the run SHALL remain `failed_retriable`
- **AND** reconnect or cancel task actions SHALL remain available.

### Requirement: ACP runner-owned files are namespaced per skill run

ACP SkillRunner-compatible runs SHALL allocate provider-internal runner-owned
file namespaces inside the run workspace.

#### Scenario: First skill run in a workspace

- **WHEN** an ACP skill run is prepared for skill `prepare-skill`
- **THEN** the runner result path SHALL end with
  `result/prepare-skill.1/result.json`
- **AND** the input manifest path SHALL end with
  `.acp/prepare-skill.1/input_manifest.json`
- **AND** the run-specific runtime audit directory SHALL end with
  `.acp/prepare-skill.1`
- **AND** the run audit metadata path SHALL end with
  `.acp/prepare-skill.1/run.json`.

#### Scenario: Reused workflow workspace isolates runner files

- **GIVEN** a workflow sequence reuses one ACP workspace
- **WHEN** downstream steps are prepared in that workspace
- **THEN** each step SHALL receive its own `resultJsonPath` and
  `inputManifestPath`
- **AND** each step SHALL receive its own `.acp/<skillId>.<n>` runtime audit
  directory
- **AND** the namespace allocation SHALL NOT require additional host/workflow
  request fields.

#### Scenario: Repeated skill id increments namespace index

- **GIVEN** one workspace has already allocated `core-skill.1`
- **WHEN** another run for `core-skill` is prepared in the same workspace
- **THEN** the second run SHALL allocate `core-skill.2`
- **AND** the second run SHALL write audit files under `.acp/core-skill.2`
  without overwriting `.acp/core-skill.1`.

### Requirement: ACP Skills detached running runs SHALL be recoverable by explicit connect

ACP Skills SHALL treat non-terminal runs with a recoverable closed conversation
as detached recoverable runs, not as active prompt turns.

#### Scenario: Detached running run needs user reconnect

- **GIVEN** an ACP Skills run is `running`, `repairing`, or `failed_retriable`
- **AND** the run has a remote `sessionId`
- **AND** `conversationState` is `closed`
- **AND** `conversationRecoveryState` is `available`
- **AND** `activePrompt` is false
- **WHEN** the ACP Skills panel renders the run
- **THEN** the run SHALL be shown as needing user reconnect
- **AND** the composer SHALL NOT emit current-turn interrupt for that run
- **AND** the task row SHALL indicate that user action is required.

#### Scenario: Connected idle running run is not interruptable

- **GIVEN** an ACP Skills run is non-terminal
- **AND** `conversationRecoveryState` is `connected`
- **AND** `activePrompt` is false
- **AND** `replyState` is `idle`
- **WHEN** the ACP Skills panel renders the run
- **THEN** the composer SHALL NOT emit current-turn interrupt
- **AND** the current-turn cancel button SHALL NOT appear enabled.

#### Scenario: Explicit connect starts recovered continuation

- **GIVEN** a detached recoverable ACP Skills run has workflow output convergence context
- **AND** it has no pending user interaction or pending permission request
- **WHEN** the user connects the run
- **THEN** Host SHALL attach the existing ACP session
- **AND** Host SHALL send the recovered continuation guard prompt
- **AND** output validation, result-file fallback, repair, pending interaction,
  final apply, and sequence continuation SHALL follow the existing recovered
  continuation behavior.

#### Scenario: Explicit connect resumes reusable workflow workspace

- **GIVEN** a detached recoverable ACP Skills run is a non-final sequence step
- **AND** the original workflow workspace still exists
- **WHEN** explicit connect produces final recovered output
- **THEN** downstream ACP sequence steps SHALL reuse the original workflow
  workspace
- **AND** runner-owned result and audit paths SHALL use fresh namespaces.

#### Scenario: Explicit connect foregrounds downstream ACP sequence steps

- **GIVEN** a detached recoverable ACP Skills run is a non-final sequence step
- **AND** explicit connect produces final recovered output
- **WHEN** Host launches downstream ACP sequence steps
- **THEN** each started downstream ACP step SHALL become the selected ACP Skills
  run
- **AND** interactive downstream ACP steps SHALL request the ACP Skills panel as
  the foreground surface.

#### Scenario: Pending interaction waits after connect

- **GIVEN** a detached recoverable ACP Skills run has a pending user interaction
  or pending permission request
- **WHEN** the user connects the run
- **THEN** Host SHALL attach the existing ACP session
- **AND** Host SHALL NOT send an automatic continuation prompt
- **AND** the run SHALL remain user-actionable for the pending reply or
  permission.

#### Scenario: Recovered current-turn cancel does not detach

- **GIVEN** an ACP Skills run has been recovered and has an active prompt turn
- **WHEN** the user cancels the current turn from the composer
- **THEN** Host SHALL stop the active ACP prompt call
- **AND** the ACP session controller SHALL remain attached
- **AND** the run SHALL remain non-terminal and recoverable for later prompts.

### Requirement: Run-local feedback patch

ACP/SkillRunner-compatible materialization SHALL inject a run-local feedback patch when `runtime_options.collect_skill_run_feedback` is true.

#### Scenario: Feedback collection disabled

- **WHEN** the runtime option is absent or false
- **THEN** the materialized skill does not include the feedback patch

#### Scenario: Feedback collection enabled

- **WHEN** the runtime option is true
- **THEN** the materialized skill includes instructions to write `_skill_run_feedback.md` in the same result subspace as `result.json`
- **AND** the source skill package remains unchanged

### Requirement: Feedback sidecar convention

ACP and SkillRunner-compatible runs SHALL treat `result/<skillId>.<n>/_skill_run_feedback.md` as a default sidecar convention.

#### Scenario: Skill completes successfully

- **WHEN** the original skill task completes according to its normal successful flow
- **THEN** the agent may write free-form Markdown feedback to `_skill_run_feedback.md`
- **AND** the file is not declared in the output schema or result JSON

#### Scenario: Skill does not complete successfully

- **WHEN** the skill task fails, is canceled, or requires pending user continuation
- **THEN** the agent does not create the feedback sidecar

### Requirement: Bundle outputs SHALL declare artifact manifests with schema roles

Bundle-producing SkillRunner-compatible outputs SHALL identify a flat artifact manifest path with `x-type: "artifact"` and `x-role: "artifact-manifest"` when the output needs multiple downstream artifact files.

#### Scenario: Artifact manifest role is discovered from output schema

- **WHEN** a successful bundle result validates against an output schema
- **AND** a top-level string field is annotated with `x-type: "artifact"` and `x-role: "artifact-manifest"`
- **THEN** a SkillRunner backend MAY treat that field value as the run's artifact manifest path
- **AND** it SHALL include the manifest file and every file listed in the manifest in the returned bundle.

#### Scenario: Flat artifact manifest is valid

- **WHEN** the backend reads an artifact manifest
- **THEN** the manifest SHALL be a flat JSON object
- **AND** each value SHALL be a non-empty workspace-relative path string
- **AND** values SHALL NOT be absolute paths or contain path traversal.

#### Scenario: Invalid artifact manifest blocks bundle assembly

- **WHEN** the manifest path is missing, unreadable, non-object, nested, contains arrays, contains empty values, or contains unsafe paths
- **THEN** bundle assembly SHALL fail with a deterministic diagnostic naming the invalid manifest entry.

### Requirement: Output Artifact Manifest Identity Uses X-Type

Bundle-producing SkillRunner-compatible outputs SHALL identify artifact manifest
fields with `x-type: "artifact-manifest"`.

#### Scenario: Artifact manifest x-type is discovered from output schema

- **GIVEN** a successful result validates against an output schema
- **AND** a top-level string field is annotated with `x-type: "artifact-manifest"`
- **THEN** the plugin SHALL treat that field value as an artifact manifest path
- **AND** it SHALL NOT require `x-role` to equal any specific value.

#### Scenario: Artifact role string does not define manifest identity

- **GIVEN** a top-level string field is annotated with `x-type: "artifact"`
- **AND** `x-role` is `artifact-manifest`
- **THEN** the plugin SHALL treat the field as a single artifact path
- **AND** it SHALL NOT expand the field value as an artifact manifest.

### Requirement: ACP SkillRunner-compatible runs SHALL record bridge transport audit

ACP SkillRunner-compatible runs using ACP transports SHALL write run-local
ACP update, timeline, bridge, and transport audit files only when debug mode is
enabled. The files SHALL live in the existing run-specific
`.acp/<skillId>.<attempt>` namespace and bridge/transport events SHALL be
correlated by spawn id.

#### Scenario: Debug ACP skill run writes detailed audit files

- **GIVEN** debug mode is enabled
- **WHEN** an ACP SkillRunner-compatible run is prepared for skill
  `literature-explainer`
- **THEN** the run MAY write detailed audit files including
  `.acp/literature-explainer.1/timeline.ndjson`
- **AND** it MAY write
  `.acp/literature-explainer.1/acp-updates.ndjson`
- **AND** it MAY write
  `.acp/literature-explainer.1/bridge.ndjson`
- **AND** it MAY write
  `.acp/literature-explainer.1/transport.ndjson`
- **AND** `run.json` SHALL list the detailed audit file paths in its `files`
  map.

#### Scenario: Normal ACP skill run skips high-volume audit files

- **GIVEN** debug mode is disabled
- **WHEN** an ACP SkillRunner-compatible run is prepared and executed
- **THEN** it SHALL NOT write `timeline.ndjson`
- **AND** it SHALL NOT write `acp-updates.ndjson`
- **AND** it SHALL NOT pass `bridge.ndjson` as a bridge audit target
- **AND** it SHALL NOT write `transport.ndjson`
- **AND** low-volume run metadata and terminal state files MAY still be written.

#### Scenario: Repeated skill runs isolate audit files

- **GIVEN** debug mode is enabled
- **AND** `.acp/core-skill.1` already exists for one run in the workspace
- **WHEN** another ACP SkillRunner-compatible run for `core-skill` is prepared
- **THEN** the new run SHALL write bridge and transport audit files under
  `.acp/core-skill.2`
- **AND** it SHALL NOT append to `.acp/core-skill.1` files.

#### Scenario: Bridge and transport audits share spawn id

- **GIVEN** debug mode is enabled
- **WHEN** the plugin launches an ACP transport for a SkillRunner-compatible run
- **THEN** the transport audit and bridge audit SHALL include the same `spawnId`
- **AND** developers SHALL be able to correlate child stdout reads, WebSocket
  stdout frames, plugin stdin writes, and close events with that id.

#### Scenario: Audit write failure does not fail the run

- **GIVEN** bridge or transport audit writing fails because the diagnostic file
  cannot be opened
- **WHEN** the ACP transport otherwise remains usable
- **THEN** audit failure SHALL be logged as diagnostic failure
- **AND** it SHALL NOT by itself fail the SkillRunner-compatible run.

### Requirement: ACP Skills process-tree cleanup SHALL preserve validated signal targets
ACP Skills normal runs, recovered runs, sequence stages, terminal cleanup, and diagnostics SHALL delegate local transport teardown to the shared controller whose signal actuation preserves the complete validated process-group target.

#### Scenario: Wrapper-backed ACP Skills controller closes
- **WHEN** an ACP Skills controller requires TERM or KILL escalation
- **THEN** it SHALL use the shared validated signal boundary
- **AND** normal, recovered, sequence, and diagnostic paths MUST NOT implement independent negative-PID cleanup

### Requirement: ACP backend diagnostics SHALL record bridge transport audit

ACP backend refresh-cache and backend probe diagnostics SHALL use the same
debug-mode-only bridge/transport audit model as SkillRunner-compatible runs.

#### Scenario: Refresh-cache diagnostic includes audit files

- **GIVEN** debug mode is enabled
- **WHEN** an ACP refresh-cache diagnostic launches a backend through the
  Windows bridge transport
- **THEN** the diagnostic result SHALL include paths for `bridge.ndjson` and
  `transport.ndjson`
- **AND** the files SHALL be written under the diagnostic runtime directory's
  `.acp` subdirectory.

#### Scenario: Backend probe diagnostic includes audit files

- **GIVEN** debug mode is enabled
- **WHEN** ACP backend probe launches a backend through the Windows bridge
  transport
- **THEN** the probe diagnostic SHALL include bridge and transport audit file
  paths
- **AND** transport events SHALL include launch plan, WebSocket, spawn, stdout,
  stderr, exit, and cleanup events when those stages occur.

### Requirement: ACP transport audit SHALL protect secrets and protocol ownership

ACP bridge and transport audit streams SHALL provide useful debugging evidence
without leaking secrets or stealing the ACP stdout stream from the protocol
reader.

#### Scenario: Secret-bearing values are redacted

- **GIVEN** environment keys or payload fields contain names such as `token`,
  `secret`, `password`, `authorization`, `api_key`, or `cookie`
- **WHEN** bridge or transport audit events are written
- **THEN** the value SHALL be redacted
- **AND** the key name MAY remain visible for diagnostic context.

#### Scenario: Protocol stdout remains single-owner

- **WHEN** the child process writes ACP JSON-RPC bytes to stdout
- **THEN** the bridge audit MAY record a bounded sanitized preview
- **AND** the plugin transport audit MAY record byte counts and frame events
- **BUT** only the ACP protocol reader SHALL consume stdout for message
  semantics.

#### Scenario: Empty assistant turn can be diagnosed

- **GIVEN** debug mode is enabled
- **AND** an ACP SkillRunner-compatible run fails because no assistant JSON
  object was produced
- **WHEN** developers inspect bridge and transport audit files
- **THEN** they SHALL be able to determine whether the child emitted assistant
  content, whether the bridge forwarded stdout frames, and whether the plugin
  received those frames.

### Requirement: ACP runner SHALL repair invalid SkillRunner-compatible output without repeating candidate payloads

When an ACP Skills run output fails validation and repair rounds remain, the runner SHALL send a repair prompt on the same ACP session. The repair prompt SHALL include validation errors and the active output contract instructions. The repair prompt SHALL NOT include the previous candidate payload.

#### Scenario: Invalid output starts repair

- **GIVEN** an ACP Skills run produces invalid final output
- **AND** repair rounds remain
- **WHEN** the runner builds the repair prompt
- **THEN** the prompt SHALL include the validation errors
- **AND** the prompt SHALL include the output contract details when available
- **AND** the prompt SHALL NOT include a `Previous candidate` section
- **AND** the prompt SHALL NOT repeat the candidate JSON payload.

### Requirement: ACP sequence steps SHALL be concrete ACP skill runs

ACP Skills SHALL store and expose only concrete ACP session or sequence step
runs in the ACP run store. A `skillrunner.sequence.v1` root workflow SHALL NOT
be represented as an ACP skill run summary.

#### Scenario: ACP sequence step uses step identity

- **GIVEN** an ACP `skillrunner.sequence.v1` step creates backend request
  `request-1`
- **WHEN** ACP foreground run registration records the step
- **THEN** the ACP run record SHALL use `request-1` as request id
- **AND** `runId` SHALL equal the workflow run id
- **AND** `jobId` SHALL equal `<sequenceJobId>:<sequenceStepId>`
- **AND** the record SHALL include `sequenceStepId`, `sequenceStepIndex`, and
  `sequenceFinalStepId` when known.

#### Scenario: ACP run summary derives sequence role

- **GIVEN** an ACP run summary has a non-empty `sequenceStepId`
- **WHEN** Dashboard or Host Bridge materializes a DTO
- **THEN** the DTO MAY expose `sequenceRole = "sequence_step"`
- **AND** the role SHALL be derived, not persisted as the source of truth.

#### Scenario: ACP startup reconcile does not create root runs

- **WHEN** ACP startup reconcile processes persisted runs and legacy task rows
- **THEN** it SHALL NOT create ACP run records from workflow sequence root
  state
- **AND** it SHALL only clean legacy ACP task rows or normalize concrete ACP
  run state.

### Requirement: ACP SkillRunner-compatible local backend cleanup SHALL account for wrapper process trees

ACP SkillRunner-compatible runs SHALL close plugin-managed local ACP backend
transports using the cached platform process-control strategy when those
backends are launched for SkillRunner-compatible runs.

#### Scenario: Wrapper-prone backend close records cleanup strategy

- **GIVEN** an ACP SkillRunner-compatible run launches a backend through a
  wrapper-prone command such as `uv`, `npx`, or a shell wrapper
- **WHEN** the run disconnects or shuts down the local transport
- **THEN** the transport lifecycle SHALL record whether process tree cleanup is
  supported and which cleanup strategy was used
- **AND** unsupported process tree cleanup SHALL be visible as a structured
  lifecycle diagnostic rather than a silent successful cleanup.

#### Scenario: Launch plan remains command source of truth

- **WHEN** process-control cleanup is enabled for an ACP backend
- **THEN** command resolution, Windows shim handling, node-direct npx handling,
  environment overlays, and command labels SHALL still come from the existing
  runtime launch plan
- **AND** process-control logic SHALL NOT re-resolve or rewrite backend command
  semantics.

#### Scenario: ACP stdout remains single-owner

- **WHEN** process-control metadata is needed for cleanup
- **THEN** it SHALL be collected through side-channel metadata or cached
  snapshot state
- **AND** it SHALL NOT write PID, ready, probe, or diagnostic content to the
  child stdout stream consumed by the ACP protocol reader.

### Requirement: ACP Skills assistant text SHALL coalesce across soft side-channel updates

ACP Skills transcript normalization SHALL keep an active assistant text segment
open across ACP update kinds that do not represent a user-visible assistant turn
boundary. `tool_call_update`, usage updates, status updates, and workspace
activity SHALL NOT complete or replace the active assistant message.

When an ACP backend provides explicit message or content identity, ACP Skills
SHALL prefer that identity for grouping assistant text. When no reliable
identity is available, ACP Skills SHALL group by the current request/session
scoped active assistant segment.

The coalescing rule SHALL be protocol- and semantics-based. It SHALL NOT branch
on backend id, provider id, agent family, command name, or product-specific
backend strings.

#### Scenario: Tool update side-channel does not split assistant text

- **GIVEN** an ACP Skills run receives an assistant text chunk
- **AND** it then receives one or more `tool_call_update` events
- **WHEN** another assistant text chunk arrives for the same active segment
- **THEN** the transcript contains one assistant message with the combined text
- **AND** the tool item remains visible as a separate transcript item.

#### Scenario: New tool call remains a hard assistant boundary

- **GIVEN** an ACP Skills run has an active assistant text segment
- **WHEN** a new `tool_call` event arrives
- **THEN** the active assistant text segment is completed
- **AND** later assistant text starts a new assistant message.

#### Scenario: User turn prevents cross-turn assistant coalescing

- **GIVEN** an ACP Skills run has a completed assistant message
- **WHEN** a user text chunk or explicit turn boundary arrives
- **THEN** later assistant text SHALL NOT append to the previous assistant
  message.

### Requirement: ACP Skills cold transcript rendering SHALL be page-first

ACP Skills SHALL render the selected cold run transcript page from the
file-backed transcript page reader without waiting for full mirror hydration.
Full mirror hydration MAY run in the background as a cache warm-up, but it SHALL
NOT be a correctness prerequisite for returning `selectedTranscriptPage`.

#### Scenario: Cold selected run returns indexed page

- **GIVEN** an ACP Skills run has durable transcript files
- **AND** its full transcript mirror is not loaded
- **WHEN** the Assistant Workspace requests the selected run panel snapshot
- **THEN** the snapshot SHALL include the selected transcript page read from the
  indexed transcript store
- **AND** the snapshot SHALL NOT wait for full mirror hydration to complete.

### Requirement: ACP Skills cold run selection SHALL be selection-first

ACP Skills SHALL publish a selected-run loading snapshot before any selected
cold run indexed page read or full mirror hydrate is allowed to block the UI.
Selecting a cold run SHALL update the selected owner first. Full mirror hydrate
SHALL NOT be scheduled by the selection operation itself.

#### Scenario: Cold run selection paints loading before page read

- **GIVEN** a cold ACP Skills run has durable transcript files
- **AND** its full transcript mirror is not loaded
- **WHEN** the user selects the run in Assistant Workspace
- **THEN** the first selected-run snapshot SHALL identify the newly selected
  run
- **AND** it SHALL report the selected transcript as loading
- **AND** it SHALL NOT include `selectedTranscriptPage`
- **AND** full mirror hydrate SHALL NOT begin before that loading snapshot.

#### Scenario: Page-first follow-up replaces loading

- **GIVEN** a loading-first snapshot has been published for a cold selected run
- **WHEN** Assistant Workspace performs the queued page-first follow-up
- **THEN** the follow-up snapshot SHALL read the selected page from the indexed
  transcript store
- **AND** full mirror hydrate MAY be scheduled only after the page-first path has
  had the opportunity to return the selected page.

### Requirement: ACP Skills cold full mirrors SHALL use a bounded LRU cache

ACP Skills SHALL keep loaded cold run full mirrors in an in-memory LRU cache
with 10 cold owner slots. Live, prompting, or lifecycle-open run mirrors SHALL
be pinned and SHALL NOT count against the cold cache slots.

#### Scenario: Cold run cache evicts least recently used owner

- **GIVEN** more than 10 cold run mirrors are loaded
- **WHEN** a new cold owner is retained
- **THEN** ACP Skills SHALL release the least recently used non-pinned cold
  mirror
- **AND** pinned live run mirrors SHALL remain loaded.

### Requirement: ACP Skills indexed page reads SHALL avoid per-event file opens

ACP Skills transcript page reads SHALL batch the byte-range reads needed for a
selected page so that a page containing many append events does not open and
close the transcript file once per event. The page reader MAY still use the
existing JSONL/index file format, but it SHALL preserve item ordering and fold
all indexed events for each returned item.

#### Scenario: Event-heavy page item reads through a batched range path

- **GIVEN** an ACP Skills transcript page item has many indexed event offsets
- **WHEN** the page reader loads that page from the transcript store
- **THEN** the reader SHALL return the folded item content
- **AND** it SHALL use a batched range read path rather than a per-event range
  helper.

### Requirement: Virtual transcript unloaded gaps SHALL show loading affordance

The shared virtual transcript renderer SHALL render a loading sentinel when the
visible viewport lands inside an unloaded page gap that has a previous or next
page cursor. The sentinel SHALL use the existing page request callback and SHALL
not create panel-specific page caches.

#### Scenario: User scrolls into an unloaded virtual gap

- **GIVEN** a virtual transcript has cached page rows and an unloaded adjacent
  page cursor
- **WHEN** the user scrolls into the spacer representing that unloaded page
  range
- **THEN** the renderer SHALL request the missing page
- **AND** it SHALL render a loading sentinel in the visible gap instead of a
  blank spacer-only viewport.

### Requirement: ACP apply-result state and controller detach SHALL have explicit ownership

ACP Skills SHALL record workflow apply-result state independently from local controller detachment. Callers that own a terminal cleanup boundary SHALL invoke and await controller detach explicitly.

#### Scenario: State recording has no detach side effect
- **WHEN** Host records a pending, succeeded, or failed ACP workflow apply result
- **THEN** it SHALL update the persisted run state and event stream
- **AND** it SHALL NOT implicitly disconnect or unregister the live controller.

#### Scenario: Explicit detach is observable and idempotent
- **WHEN** an owner explicitly detaches a controller after terminal apply settlement
- **THEN** Host SHALL unregister that controller at most once
- **AND** it SHALL record detach start and completion or failure events
- **AND** the caller SHALL be able to await the detach operation.

#### Scenario: Normal and recovered continuation share cleanup semantics
- **WHEN** a non-final ACP sequence step succeeds during initial execution or recovered continuation
- **THEN** both paths SHALL use the same intermediate-step settlement policy before downstream dispatch.

#### Scenario: Failed step apply cleans up before propagation
- **WHEN** an ACP sequence step result apply fails
- **THEN** Host SHALL record the failed apply state and settle the owned controller before propagating the failure.

### Requirement: Plugin-owned ACP audit streams are physically batched

Debug-only plugin-owned `timeline.ndjson`, `acp-updates.ndjson`, and `transport.ndjson` streams SHALL preserve ordered sanitized logical records during normal operation while using bounded low-frequency true append operations. Under sustained sink failure or backpressure beyond the audit-only hard limit, the plugin MAY drop the oldest pending audit records with observable drop counters; this policy MUST NOT apply to transcript or other business persistence channels.

#### Scenario: Audit burst appends one batch without whole-file rewrite

- **GIVEN** ACP debug mode is enabled
- **WHEN** many audit records are emitted for one owner and file before a forced boundary
- **THEN** every retained logical record SHALL remain independently readable in order
- **AND** the plugin SHALL append the pending batch without reading and rewriting the existing complete file
- **AND** physical writes SHALL be bounded by the configured time, byte, entry, and durability thresholds.

#### Scenario: Audit enqueue does not await timer durability

- **WHEN** an adapter session update or transport callback enqueues an audit record
- **THEN** the callback SHALL be able to continue without waiting for the trailing flush timer
- **AND** the record SHALL remain pending until a threshold, audit boundary, or audit-only hard limit processes it.

#### Scenario: Audit failure is best-effort and bounded

- **WHEN** one physical audit append fails
- **THEN** the run SHALL continue
- **AND** one structured audit failure SHALL be recorded for that attempt
- **AND** pending logical records SHALL remain available for retry only within the configured audit hard limits
- **AND** overflow SHALL be represented by dropped-entry, dropped-byte, and overflow-episode diagnostics.

### Requirement: ACP adapter diagnostics are observational rather than canonical run lifecycle

ACP Skills SHALL route adapter diagnostics to bounded runtime evidence without using them as canonical run events, transcript events, or lifecycle state transitions.

#### Scenario: Information diagnostic does not mutate canonical state
- **WHEN** an active or recovered ACP Skills run observes any number of info or JSON-RPC trace diagnostics
- **THEN** the diagnostics MUST NOT modify run status, `updatedAt`, event history, transcript, result, permission, or recovery state
- **AND** they MUST NOT write a canonical run row or run-event row
- **AND** they MUST NOT publish run, transcript, progress, or other business Workspace changes.

#### Scenario: Warning and error diagnostics remain available without becoming business state
- **WHEN** an adapter emits a warning or error diagnostic
- **THEN** sanitized evidence MAY be written to the bounded request-scoped runtime log
- **AND** debug mode MAY additionally enqueue sanitized audit evidence
- **AND** neither sink may alter or block ACP run execution state.

#### Scenario: Business boundaries retain their explicit persistence owners
- **WHEN** prompt failure, permission, authentication, connection close, cancellation, interruption, apply, result, or terminal state occurs
- **THEN** the existing explicit business handler MUST persist that state independently of any adapter diagnostic
- **AND** removing diagnostic persistence MUST NOT suppress the business transition.

#### Scenario: Historical diagnostic events remain readable
- **WHEN** a stored run predating this requirement contains adapter diagnostic events
- **THEN** the reader MUST tolerate and expose the stored history without migration
- **AND** newly observed adapter diagnostics MUST NOT be appended to that history.

### Requirement: ACP audit durability follows diagnostic boundaries

Plugin-owned pending audit streams SHALL flush for their target owner at prompt or turn terminal, adapter close or explicit disconnect, run terminal, diagnostic completion, and controlled shutdown.

#### Scenario: Diagnostic result contains complete plugin audit

- **WHEN** a backend probe or refresh-cache diagnostic returns its result
- **THEN** pending plugin-owned audit records for that diagnostic owner SHALL already be appended
- **AND** the returned diagnostic directory SHALL be complete for those streams.

#### Scenario: Non-debug execution creates no high-volume audit

- **GIVEN** debug mode is disabled
- **WHEN** ACP execution emits transcript, transport, or lifecycle activity
- **THEN** the plugin SHALL NOT create `timeline.ndjson`, `acp-updates.ndjson`, or `transport.ndjson`.

#### Scenario: Bridge audit ownership remains external

- **WHEN** the Rust WebSocket bridge writes `bridge.ndjson`
- **THEN** the plugin buffered audit writer SHALL NOT own, buffer, merge, or rewrite that file.

### Requirement: ACP Skills silent projection does not alter execution semantics

Silent mode SHALL suppress ACP Skills process projection before transcript persistence while preserving prompt execution, assistant output accumulation for validation, permission handling, recovery, timeout, cancellation, output convergence, and audit ownership.

#### Scenario: suppressed protocol updates still support final output

- **WHEN** a silent ACP Skills prompt uses thoughts and tools before producing valid output
- **THEN** those process updates do not enter transcript state
- **AND** validation and final output completion behave as in other display modes.

#### Scenario: dynamic mode change applies immediately

- **WHEN** the global mode changes during an active prompt
- **THEN** subsequent updates use the new policy
- **AND** omitted updates are neither deleted from prior history nor backfilled later.

### Requirement: ACP Skills message counts follow user execution boundaries

ACP Skills SHALL begin a new current message-count execution only for a user-originated run or explicit user retry. Automatic prompt repair, continuation, recovery, and output convergence attempts SHALL retain the same execution identity while continuing to update the owner cumulative count.

#### Scenario: automatic retry preserves current identity

- **WHEN** the orchestrator automatically starts another agent prompt for repair or recovery
- **THEN** it reuses the current message-count execution identity
- **AND** new Assistant, Thought, and Tool activity continues the current values.

#### Scenario: explicit retry begins new current values

- **WHEN** the user explicitly retries the selected run
- **THEN** current category values reset before new protocol activity
- **AND** cumulative owner values remain unchanged until new semantic activity occurs.

### Requirement: Kilo ACP Skill runs SHALL safely omit rejected none reasoning overrides

Before an ACP Skill prompt starts, the runner SHALL omit a Kilo
`thought_level` override when the config request returns JSON-RPC invalid
parameters (`-32602`) and the error message indicates an effort-related
rejection. It SHALL retain the same session and selected model,
continue with the backend-default reasoning behavior, and record the fallback
as a structured diagnostic event. The persisted effective runtime options SHALL
not restore the rejected override.

#### Scenario: Initial prompt continues after Kilo none rejection

- **WHEN** a new Kilo ACP session rejects a `thought_level` value with code `-32602` and error message indicating an effort-related rejection
- **THEN** the runner SHALL submit the prompt once in that same session without a thought-level override
- **AND** the run SHALL record the fallback as a diagnostic event without marking the task failed.

#### Scenario: Recovered session does not resend rejected none

- **GIVEN** a prior Kilo run recorded an effort fallback
- **WHEN** the session is recovered
- **THEN** runtime-option restoration SHALL not submit the rejected `thought_level` value
- **AND** the recovered prompt SHALL retain the selected model and normal recovery behavior.

#### Scenario: Other configuration failures are preserved

- **WHEN** a non-Kilo backend, a non-`-32602` error, or a `-32602` error whose message does not indicate an effort-related rejection occurs
- **THEN** the runner SHALL preserve the configuration failure
- **AND** it SHALL not start a fallback prompt.

### Requirement: ACP Skills lifecycle cleanup SHALL use the shared controller close

ACP Skills and the SkillRunner-compatible runner SHALL use the shared transport controller for local execution, recovery, sequence, probe, diagnostic, failure, detach, and shutdown cleanup.

#### Scenario: Normal and recovered runs share controller safety

- **WHEN** a local ACP Skills run starts normally or through recover, resume, or load
- **THEN** all owned session transports SHALL use the same shared controller teardown policy.

#### Scenario: Terminal paths share controller safety

- **WHEN** a run is cancelled, interrupted, hard-timed-out, explicitly disconnected, ended, detached after apply, fails, or is closed during shutdown
- **THEN** the owning path SHALL close the shared controller
- **AND** it SHALL NOT duplicate process-group ownership logic.

#### Scenario: Sequence detach ordering is preserved

- **WHEN** a sequence step reaches its awaited detach boundary
- **THEN** it SHALL await the shared controller close using the existing sequence lifecycle semantics
- **AND** this change SHALL NOT synthesize an apply result or alter workflow output.

#### Scenario: Diagnostic paths share controller safety

- **WHEN** an ACP Skills diagnostic uses an adapter session or a raw transport probe
- **THEN** both paths SHALL enter the shared controller boundary.

### Requirement: ACP Skills trace context is transient and identity-neutral

ACP Skills ordinary requests and sequence steps SHALL carry transient debug-only parent workflow recording context separately from `AcpSkillRunRecord.runId`, `requestId`, sequence composite identity, and Host Bridge run identity. The context SHALL authorize activity publication only while its matching recorder round and claimed root remain live, and SHALL never be persisted or exposed through provider or Host Bridge protocols.

#### Scenario: Ordinary ACP request is recorded
- **WHEN** a concrete request starts under a claimed top-level workflow execution
- **THEN** its start, semantic events, and terminal SHALL be recorded under that execution root
- **AND** its public and persistent run identities SHALL remain unchanged.

#### Scenario: Stale request terminal arrives
- **WHEN** a terminal from an invalidated recording round or a different root arrives
- **THEN** it SHALL not close current activity or append to the current trace.

#### Scenario: Concrete terminal settles
- **WHEN** a registered request becomes terminal through success, failure, cancellation, or forced cleanup
- **THEN** exactly one matching request end SHALL close that activity before workflow-root completion.

### Requirement: ACP transcript range batches SHALL use bounded packed worker transfer

ACP Chat and ACP Skills indexed transcript reads in Zotero SHALL send bounded
range batches to one reusable privileged worker. Each physical batch SHALL open
the source once and return one packed transferable byte buffer plus range
length metadata instead of one main-thread file operation or transferable
object per event.

#### Scenario: Event-heavy page is hydrated
- **WHEN** one selected transcript page requires many indexed event ranges
- **THEN** the ranges SHALL be partitioned by fixed entry and byte budgets
- **AND** each batch SHALL open and close the source once
- **AND** the folded page items SHALL preserve index item and event order.

#### Scenario: Range reaches or exceeds EOF
- **WHEN** a normalized indexed range overlaps or begins beyond the observed file size
- **THEN** the worker SHALL return the available short read or an empty result in the corresponding output position
- **AND** it SHALL NOT read outside the file.

#### Scenario: Worker generation fails
- **WHEN** the worker errors, times out, or is stopped during pending reads
- **THEN** every request owned by that generation SHALL settle with a structured failure
- **AND** a later request MAY lazily create a fresh generation unless controlled shutdown has begun.

### Requirement: Tail-follow renders the tail window without speculative history requests

When the virtual transcript renderer follows the tail (stick-to-bottom intent), it SHALL compute the render window from the tail of the virtual layout rather than the container's pre-stick `scrollTop`, and the loading-gap evaluation SHALL use the same tail position. A tail-follow render SHALL NOT emit page requests or loading sentinels for gaps the tail window cannot reveal. Non-stick renders SHALL continue to compute the window from the live `scrollTop`.

#### Scenario: First stick-to-bottom render of a long transcript

- **GIVEN** a virtual transcript whose cached tail page has an unloaded previous page
- **AND** the container is in stick-to-bottom state
- **WHEN** the first render for an owner commits
- **THEN** the window SHALL cover the tail rows of the cached page
- **AND** no previous-page request or loading sentinel SHALL be emitted for the offscreen gap
- **AND** the transcript SHALL NOT flash a top-spacer frame before sticking to the bottom.

#### Scenario: Short transcript still prefetches the visible gap

- **GIVEN** a virtual transcript whose full layout fits inside the viewport
- **AND** the container is in stick-to-bottom state
- **WHEN** the first render commits with an unloaded previous page
- **THEN** the renderer MAY request the previous page and show its loading sentinel, because the gap is visible from the tail position.

### Requirement: Incremental renders keep scroll bookkeeping in sync

After an incremental transcript effect restores the viewport anchor or the preserved scroll position, the renderer SHALL write the resulting `scrollTop` to the last-scroll-top marker, matching the full render path. Scroll bookkeeping SHALL NOT leave a stale marker that a later scroll event can misread as an upward user scroll.

#### Scenario: Anchor restore after a tail patch

- **GIVEN** a virtual transcript is anchored away from the bottom
- **WHEN** an incremental effect restores the viewport
- **THEN** the last-scroll-top marker SHALL equal the restored `scrollTop`
- **AND** the tail-follow state SHALL NOT be cleared unless a real user scroll moves upward.

