## MODIFIED Requirements

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

### Requirement: ACP skill runner MUST disconnect recoverably on hard timeout

ACP skill execution SHALL apply `hard_timeout_seconds` as a local ACP connection
guard. Timeout expiry MUST disconnect the local ACP connection through existing
recoverable disconnect semantics, MUST NOT introduce a terminal run state, and
MUST NOT mark the run as `failed` or `canceled`.

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
- **WHEN** the ACP adapter exposes a backend prompt error from a JSON-RPC
  response or an explicit prompt-level provider `session/update` extension such
  as `backend_error` or `prompt_error`
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

ACP skill run startup reconciliation SHALL preserve recoverable non-terminal
runs while clearing non-recoverable stale local executions.

#### Scenario: Recoverable ACP run survives local controller loss
- **GIVEN** an ACP skill run is non-terminal and its conversation recovery state
  is `available` or `connected`
- **WHEN** startup reconciliation runs after a plugin restart
- **THEN** the run SHALL remain non-terminal and recoverable
- **AND** the associated workflow task projection SHALL NOT be failed solely
  because the local controller is gone.

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

### Requirement: ACP Skills detached running runs SHALL be recoverable by explicit connect

ACP Skills SHALL treat non-terminal runs with a recoverable closed conversation
as detached recoverable runs, not as active prompt turns.

#### Scenario: Detached running run needs user reconnect
- **GIVEN** an ACP Skills run is `running`, `repairing`, or
  `failed_retriable`
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
- **GIVEN** a detached recoverable ACP Skills run has workflow output
  convergence context
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

### Requirement: ACP Skills active task projections SHALL use ACP status classifiers

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
