# acp-skillrunner-compatible-runner Specification

## Purpose
TBD - created by archiving change add-acp-skillrunner-compatible-runner. Update Purpose after archive.
## Requirements
### Requirement: ACP backend SHALL execute SkillRunner-compatible workflow jobs


The system SHALL allow `skillrunner.job.v1` workflow requests to execute through
an ACP backend without changing the workflow-facing request contract, when the
workflow's provider-derived backend compatibility allows an ACP backend.
`request.kind` alone SHALL NOT make ACP or SkillRunner backends compatible.

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
- **AND** the run workspace contains a valid `${skill_id}.result.json` outside `result/` and `.audit/`
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
- **THEN** ACP SHALL NOT generate `.audit/contracts/target_output_schema.json`
- **AND** it SHALL NOT pass active structured-output schema options to the ACP backend.

#### Scenario: Artifact paths are not rewritten

- **WHEN** final output contains schema fields annotated with `x-type=artifact` or `x-type=file`
- **THEN** ACP SHALL NOT rewrite those fields to bundle-relative paths.
### Requirement: ACP Skill runs SHALL optionally auto-approve ACP tool permissions


ACP Skill runs SHALL automatically resolve ACP backend tool-call permission
requests only when the run's frozen ACP provider options enable permission
auto-approval.

#### Scenario: Approve option is selected

- **GIVEN** an ACP Skill run has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission with an `approve` option
- **THEN** the run SHALL resolve the permission with that option
- **AND** the transcript SHALL retain the normal permission audit item.

#### Scenario: Allow option is selected

- **GIVEN** an ACP Skill run has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission with an allow-style option
- **THEN** the run SHALL resolve the permission with the first compatible
  allow-style option.

#### Scenario: Non-allow requests remain manual

- **GIVEN** an ACP Skill run has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission without any approve or allow-style
  option
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
- **WHEN** prompt failure governance fails the run
- **THEN** the run SHALL be terminal `failed`
- **AND** the conversation SHALL be `closed`
- **AND** recovery SHALL remain `available`.

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

### Requirement: ACP runner-owned files are namespaced per skill run

ACP SkillRunner-compatible runs SHALL allocate provider-internal runner-owned
file namespaces inside the run workspace.

#### Scenario: First skill run in a workspace

- **WHEN** an ACP skill run is prepared for skill `prepare-skill`
- **THEN** the runner result path SHALL end with
  `result/prepare-skill.1/result.json`
- **AND** the input manifest path SHALL end with
  `.audit/prepare-skill.1/input_manifest.json`.

#### Scenario: Reused workflow workspace isolates runner files

- **GIVEN** a workflow sequence reuses one ACP workspace
- **WHEN** downstream steps are prepared in that workspace
- **THEN** each step SHALL receive its own `resultJsonPath` and
  `inputManifestPath`
- **AND** the namespace allocation SHALL NOT require additional host/workflow
  request fields.

#### Scenario: Repeated skill id increments namespace index

- **GIVEN** one workspace has already allocated `core-skill.1`
- **WHEN** another run for `core-skill` is prepared in the same workspace
- **THEN** the second run SHALL allocate `core-skill.2`.

### Requirement: ACP Skills detached running runs SHALL be recoverable by explicit connect

ACP Skills SHALL treat non-terminal runs with a recoverable closed conversation
as detached recoverable runs, not as active prompt turns.

#### Scenario: Detached running run needs user reconnect

- **GIVEN** an ACP Skills run is `running`, `repairing`, or recoverable `failed`
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
