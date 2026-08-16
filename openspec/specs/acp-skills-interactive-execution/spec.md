# acp-skills-interactive-execution Specification

## Purpose
TBD - created by archiving change add-acp-skills-interactive-execution. Update Purpose after archive.
## Requirements
### Requirement: ACP Skill Runs Detach Local Conversation After Workflow Success

ACP Skill runs SHALL return the provider result and detach the local ACP
controller/adapter/transport after validating a final assistant turn payload and
successfully applying the workflow. The run SHALL preserve its `sessionId` and
recovery metadata so a follow-up reply can reconnect to the same remote session
when supported.

#### Scenario: Success Detaches Local Conversation

- **GIVEN** an ACP Skill run has produced a valid assistant turn payload with
  `__SKILL_DONE__: true`
- **AND** workflow apply has succeeded
- **WHEN** the runner finalizes the run
- **THEN** the run status is `succeeded`
- **AND** the conversation state is `closed`
- **AND** the live run controller is not retained
- **AND** a later text reply can recover the same `sessionId` if recovery is
  supported.

### Requirement: ACP Skill Interactive Pending Turns Do Not Trigger Apply

Interactive ACP Skill runs SHALL treat `__SKILL_DONE__: false` turn payloads as waiting-user state, not as workflow completion.

The pending envelope `message` SHALL be projected into the canonical assistant transcript message. The pending envelope `ui_hints` SHALL only drive hint widget controls and SHALL NOT be repeated as banner or notice text.

#### Scenario: Pending turn projects message and hints separately

- **GIVEN** an interactive ACP Skill run returns a schema-valid payload with `__SKILL_DONE__: false`, `message`, and `ui_hints`
- **WHEN** the runner converges the assistant turn
- **THEN** the run status is `waiting_user`
- **AND** the pending `message` appears as the assistant transcript message
- **AND** `ui_hints` controls the hint widget prompt, hint, and quick reply options
- **AND** workflow apply is not triggered.

### Requirement: ACP Skills publishes structured waiting-user controls

ACP Skills SHALL preserve validated `ui_hints` in its Assistant pending-interaction projection. A pending message SHALL appear in transcript only, while prompt, hint, options, and file declarations SHALL drive only the interaction region. Reply submission SHALL use the selected request's current waiting lifecycle without deriving an interaction token from output state.

#### Scenario: Choice interaction is published

- **WHEN** ACP output enters waiting-user with structured options
- **THEN** the selected owner snapshot SHALL include a typed choice interaction without a synthetic token
- **AND** choosing a current option SHALL deterministically convert its JSON value to continuation prompt text

#### Scenario: Detached continuation asks for another reply

- **GIVEN** an interrupted live run continues through its existing serialized prompt chain
- **WHEN** that continuation publishes another waiting-user interaction
- **THEN** the next reply SHALL reach the current controller without requiring a synthetic interaction identity
- **AND** its visible response SHALL be appended to the user transcript once.

### Requirement: ACP file replies use shallow managed workspace staging

ACP Skills SHALL select declared files through host-native pickers and atomically stage them under `.acp-inputs/<short-request-key>-<submission-key>/<safe-file-name>`. The final directory SHALL contain no per-slot directories, original paths, or file bytes in its manifest.

#### Scenario: Required file selection is cancelled

- **WHEN** a required slot picker is cancelled
- **THEN** the whole submission SHALL stop without continuation

#### Scenario: Optional file selection is cancelled

- **WHEN** an optional slot picker is cancelled
- **THEN** that slot SHALL be skipped
- **AND** the submission SHALL continue only if at least one file remains

#### Scenario: Files are staged successfully

- **WHEN** all accepted selections copy and the manifest is written
- **THEN** the temporary sibling directory SHALL be atomically renamed to the final shallow directory
- **AND** transcript SHALL show display filenames only
- **AND** ACP prompt text SHALL use shallow workspace-relative paths only

#### Scenario: Pending interaction changes during selection

- **WHEN** the selected request is no longer waiting for a file interaction before picker completion
- **THEN** the host SHALL not stage or submit those selections
- **AND** one request SHALL have at most one in-flight native file-selection flow.

### Requirement: ACP Skill Result Envelope Is Runner-Generated

ACP Skills SHALL write the runner-owned result JSON path only after final turn
convergence; agents SHALL NOT be instructed to write that file as the completion
signal.

When a final envelope is projected to the transcript, the `__SKILL_DONE__`
marker SHALL be removed from the visible canonical message.

#### Scenario: Final turn projects canonical message

- **GIVEN** an assistant turn returns a schema-valid payload with
  `__SKILL_DONE__: true`
- **WHEN** the runner validates the final output fields
- **THEN** the runner writes the final payload to the run record's
  `resultJsonPath`
- **AND** the transcript displays the canonical final message without the
  `__SKILL_DONE__` marker.

### Requirement: ACP Skill Replies Reuse The Same ACP Session

Plain-text replies from the ACP Skills panel SHALL be sent as additional
`session/prompt` requests on the existing ACP session. If the local controller
is missing but the run has a recoverable `sessionId`, ACP Skills SHALL restore
that remote session before sending the reply. Initial execution, same-session
reply, repair, and recovered execution SHALL use the persisted run-effective
runtime selection. Lifecycle code SHALL NOT retain a second frozen selection
after the run is created and SHALL NOT reapply model settings before an ordinary
same-session reply.

#### Scenario: Reply After Local Controller Loss

- **GIVEN** a recoverable ACP Skill run has no live local controller
- **WHEN** the user sends a reply
- **THEN** ACP Skills restores the persisted remote session
- **AND** sends the reply to the same `sessionId`
- **AND** does not create a replacement session.

#### Scenario: Continuation Prompt Repeats Output Contract

- **GIVEN** an ACP Skill run is continued with a user reply
- **WHEN** ACP Skills sends the continuation prompt
- **THEN** the prompt SHALL identify the same run workspace and requested skill
- **AND** it SHALL repeat the JSON-only final/pending branch contract
- **AND** it SHALL forbid explanations and Markdown fences.

#### Scenario: Accepted Reply Starts An Active Prompt Turn

- **GIVEN** a non-terminal ACP Skill run is waiting for user input on a reusable
  ACP session
- **WHEN** the user's reply is accepted and the next `session/prompt` request is
  about to start
- **THEN** the main run status SHALL transition to `running`
- **AND** `activePrompt` SHALL be `true`
- **AND** stale pending-interaction and prompt-interruption state SHALL be cleared
- **AND** the ACP Skills panel SHALL project the run as running rather than
  waiting for user input.

#### Scenario: Recovered Follow-Up Without Workflow Convergence Settles

- **GIVEN** a recovered non-terminal run can reuse its ACP session but has no
  workflow-output convergence context
- **WHEN** a user reply starts a follow-up prompt
- **THEN** the run SHALL be `running` while that prompt is active
- **AND** a normally completed prompt SHALL settle the run back to `waiting_user`
- **AND** a failed prompt SHALL settle the run to `failed_retriable` while keeping
  the recovered session available for a later reply.

#### Scenario: Direct reply preserves the session selection

- **GIVEN** a run executed its first prompt with model B and is waiting for user input
- **WHEN** the user sends a direct reply without editing runtime options
- **THEN** the runner SHALL send the reply without an additional model setter
- **AND** the next turn and composer SHALL remain on model B.

#### Scenario: Explicit edit changes the next turn

- **GIVEN** a waiting run uses model B
- **WHEN** a successful explicit setter changes the run-effective model to C
- **THEN** exactly that setter SHALL perform the remote change
- **AND** the next prompt and composer SHALL use model C.

#### Scenario: Recovery reapplies the persisted selection

- **GIVEN** a recoverable run persists model B
- **AND** the recovered session handshake reports model A
- **WHEN** ACP Skills reconnects the existing session
- **THEN** the shared lifecycle applicator SHALL apply model B before recovered execution
- **AND** the run and composer SHALL continue to display model B.

#### Scenario: Reasoning transport follows catalog provenance

- **WHEN** a run-effective reasoning choice has `explicit` provenance
- **THEN** the lifecycle applicator SHALL use the independent thought-level transport
- **AND** when the choice has `model-derived` provenance it SHALL select only the corresponding raw model variant.

### Requirement: ACP Skill Apply Is Single-Shot

Automatic Zotero writeback SHALL happen only from the first validated workflow result for the run.

#### Scenario: Follow-Up Does Not Reapply

- **GIVEN** workflow apply already succeeded for an ACP Skill run
- **WHEN** additional agent messages or tool calls occur in the same conversation
- **THEN** the run transcript is updated
- **AND** the workflow apply seam is not invoked again for that follow-up.

### Requirement: ACP Skill Output Revision Trail

ACP Skills SHALL record invalid candidates, repair attempts, replacement reasons, and repaired outcomes as an output revision trail.

The main transcript SHALL show only canonical assistant messages. Invalid or replaced candidates SHALL be available through details/diagnostics and SHALL NOT render as ordinary assistant messages.

#### Scenario: Invalid candidate is diagnostic-only

- **GIVEN** an ACP Skill run receives an invalid output candidate
- **WHEN** output validation triggers repair
- **THEN** the invalid candidate is recorded in output revisions
- **AND** the main transcript does not show the raw invalid candidate as a normal assistant message.

#### Scenario: Repaired candidate shows revision badge

- **GIVEN** a turn has one or more invalid candidates before a valid pending or final output
- **WHEN** the canonical assistant message renders
- **THEN** the message may show a compact revision badge
- **AND** the full candidate trail is available in details/diagnostics.

### Requirement: ACP Skills run archive marker

ACP Skills SHALL support archiving terminal runs without deleting canonical business run history, request-scoped logs, workspace artifacts, result artifacts, transcript records, or debug audit artifacts already materialized before archive. Archiving SHALL NOT require adapter diagnostics to exist as canonical run events.

Archived runs SHALL be hidden from the default ACP Skills Runs drawer and selected-run snapshot.

ACP Skills `Cancel Run` SHALL remain a non-terminal run lifecycle action and SHALL NOT be used to archive terminal runs.

#### Scenario: Terminal ACP Skills run is archived

- **Given** an ACP Skills run has terminal status
- **When** the user activates the Archive item action for that run
- **Then** the run record is marked with `archivedAt`
- **And** the run no longer appears in default ACP Skills panel snapshots
- **And** canonical business history, transcript, result artifacts, request-scoped logs, and existing debug audit artifacts remain under their existing retention policy.

### Requirement: ACP Skills interruption is confirmed by prompt settlement

ACP Skills SHALL keep the current prompt active after sending `session/cancel` and SHALL let the orchestrator exclusively own requested, confirmed, forced, and unconfirmed interruption transitions.

#### Scenario: Skill turn interruption is requested
- **WHEN** the user interrupts a live or recovered skill prompt
- **THEN** the run MUST retain its active prompt and running or repairing state
- **AND** Reply MUST remain disabled
- **AND** the interruption state MUST be `requested`.

#### Scenario: Skill turn cancellation is confirmed
- **WHEN** the original prompt returns `stopReason: "cancelled"`
- **THEN** the run MUST move to `waiting_user`
- **AND** the interruption state MUST be `confirmed`
- **AND** the adapter MUST remain available for continuation.

#### Scenario: Skill turn settles after interruption
- **WHEN** the original prompt settles after interruption was requested
- **THEN** the run MUST move to `waiting_user`
- **AND** the interruption state MUST be `confirmed`
- **AND** the adapter MUST remain available for continuation
- **AND** assistant text from the interrupted turn MUST NOT enter result-file fallback, output validation, output repair, or workflow apply.

### Requirement: ACP Skills interruption has a recovery-aware force-stop

ACP Skills SHALL close the current run's adapter when the prompt remains unsettled for 10 seconds and SHALL base the post-close run state on negotiated recovery capabilities.

#### Scenario: Force-stopped run supports recovery
- **WHEN** interruption remains unconfirmed for 10 seconds
- **AND** the backend supports resume or load
- **THEN** the run MUST close its adapter and unregister its controller
- **AND** it MUST become `waiting_user` with recovery available
- **AND** the interruption state MUST be `forced`.

#### Scenario: Force-stopped run cannot recover
- **WHEN** interruption remains unconfirmed for 10 seconds
- **AND** the backend supports neither resume nor load
- **THEN** the run MUST close its adapter and unregister its controller
- **AND** it MUST become terminal with recovery unsupported
- **AND** Reply MUST remain unavailable.

#### Scenario: Old prompt settles after force-stop
- **WHEN** a force-stopped prompt later resolves or rejects
- **THEN** its stale outcome MUST NOT restore an active controller or overwrite the forced run state.

### Requirement: ACP Skills interruption events have one lifecycle owner

ACP Skills SHALL record each interrupt transition once from the orchestrator and SHALL NOT duplicate optimistic transitions in the run store.

#### Scenario: Interrupt lifecycle is audited
- **WHEN** a skill turn progresses through interruption request and completion
- **THEN** the run MUST record `interrupt-requested` once
- **AND** it MUST record exactly one of `interrupt-confirmed` or `interrupt-forced` when applicable.

### Requirement: ACP Skills SHALL serialize visible permission requests per run

ACP Skills SHALL retain permission requests per run in arrival order, project the queue head, and correlate resolution with the active permission request ID.

#### Scenario: Two run approvals overlap

- **WHEN** one ACP Skills run receives two permission requests before either is resolved
- **THEN** the first request SHALL remain visible until it is resolved
- **AND** the second request SHALL then become visible
- **AND** both resolvers SHALL reach exactly one terminal outcome.

#### Scenario: A run owner is removed

- **WHEN** a run controller is removed with unresolved permission requests
- **THEN** every unresolved request for that run SHALL be settled as cancelled.

### Requirement: ACP interactive continuation SHALL regain its submission slot

For a Host-submitted run that yielded, ACP Skills SHALL retain user reply, authorization, and retry intent in memory and request priority resumption before sending the next backend prompt. Cancellation SHALL remain available without a slot and SHALL cancel an unsent continuation.

#### Scenario: Reply waits behind active sibling

- **WHEN** a user replies while another unit holds the submission's only slot
- **THEN** ACP Skills SHALL show the task as resumption-pending
- **AND** SHALL not call the backend until priority admission succeeds

#### Scenario: User cancels before reply admission

- **WHEN** cancellation is confirmed while a reply is resumption-pending
- **THEN** the cached reply callback SHALL not run
- **AND** terminal settlement SHALL not leak or double-release a slot

### Requirement: A concurrency slot SHALL cover the complete workflow execution unit

An admitted execution unit and its submission slot MUST have independent lifecycles. A slot MUST remain occupied while provider work or Host-owned result application is actively proceeding. `waiting_user`, `waiting_auth`, and recoverable failure states MUST yield the slot without settling the unit. Success, terminal failure, confirmed cancellation, and hard timeout MUST release at most one held slot and settle the unit exactly once.

#### Scenario: Successful unit finishes result application

- **WHEN** an admitted unit's provider run succeeds
- **THEN** the Host SHALL reacquire a slot if the unit previously yielded
- **AND** it SHALL keep that slot through terminal result application
- **AND** it SHALL release exactly one held slot after apply settles

#### Scenario: Sequence pauses for user interaction

- **WHEN** an admitted sequence unit enters `waiting_user`, `waiting_auth`, or a recoverable failure
- **THEN** the unit SHALL remain non-terminal
- **AND** it SHALL yield its submission slot exactly once
- **AND** the Host MAY admit the next initial unit from that submission

#### Scenario: Unit reaches a terminal outcome without a held slot

- **WHEN** a yielded unit reaches terminal failure, hard timeout, success, or confirmed cancellation before local resumption
- **THEN** the Host SHALL cancel any unsent resumption callback
- **AND** it SHALL settle the unit without decrementing the held-slot count below zero

### Requirement: Resumption admission SHALL precede initial work within one submission

The Host SHALL enqueue a yielded unit's reply, authorization, retry, autonomous local continuation, or apply as a resumption request. Resumptions MUST retain request order and MUST be admitted before not-yet-started units from the same submission. They MUST NOT compete with or consume slots from another submission.

#### Scenario: Waiting unit resumes behind current work

- **GIVEN** a one-slot submission ordered A, B, C
- **AND** A yields so B is admitted
- **WHEN** A requests resumption while B holds the slot
- **THEN** A SHALL remain resumption-pending until B releases the slot
- **AND** A SHALL be admitted before initial unit C

#### Scenario: Two submissions resume independently

- **WHEN** yielded units from two submissions request resumption
- **THEN** each request SHALL be ordered only against work in its own submission
- **AND** neither submission SHALL change the other's held-slot count

### Requirement: Submission display identity SHALL be safe and stable

Each process-local submission SHALL freeze a provider label, model label, and stable symbol when created. The symbol MUST use the ordered non-numeric celestial/natural alphabet `🌙`, `☀️`, `⭐`, `☄️`, `🪐`, `🌍`, `🌊`, `🔥`, extending with ordered multi-symbol codes after eight submissions. Display identity MUST NOT contain credentials or full provider options and MUST NOT be reused while the process is running.

#### Scenario: More than eight submissions coexist

- **WHEN** the ninth and later submissions are created
- **THEN** each SHALL receive a unique stable multi-symbol code
- **AND** no code SHALL contain a digit or numeric emoji

#### Scenario: Model configuration is absent

- **WHEN** provider or model display input is blank
- **THEN** the frozen display identity SHALL expose an explicit localized default fallback
- **AND** it SHALL not copy arbitrary provider options

### Requirement: ACP Skill setup is observable per request

ACP Skills SHALL record stable request-scoped setup stages for an admitted run,
including workspace creation, registry readiness, skill materialization, Host
Bridge CLI readiness, runtime dependency resolution, adapter creation,
transport spawn, ACP initialization, session creation, and prompt start. Stage
records SHALL retain the request and submission-unit identity and SHALL NOT
include credentials or full request payloads.

#### Scenario: Concurrent setup stages are distinguishable

- **GIVEN** two ACP Skill units are admitted from one submission
- **WHEN** both units progress through setup
- **THEN** each run SHALL expose its own last completed setup stage
- **AND** each run SHALL retain its own `requestId`, `submissionId`, and
  `submissionUnitId`
- **AND** available transport diagnostics SHALL retain the run's `spawnId` and
  child identity.

### Requirement: ACP Skill setup is cancellable before a live session

ACP Skills SHALL expose an internal setup cancellation handle immediately after
run creation and before the first potentially blocking setup await. Setup
cancellation SHALL record a terminal canceled intent and SHALL NOT mark the run
as connected, recoverable, or eligible for ordinary disconnect/recovery.

#### Scenario: Setup is canceled before adapter creation

- **GIVEN** an ACP Skill run has been created but its adapter does not yet exist
- **WHEN** the run is canceled
- **THEN** subsequent setup stages SHALL stop at their next cancellation check
- **AND** the run SHALL settle as `canceled`
- **AND** no session or prompt SHALL be created.

#### Scenario: Adapter is created after setup cancellation

- **GIVEN** cancellation wins while adapter creation is still in flight
- **WHEN** adapter creation resolves
- **THEN** the adapter SHALL be closed immediately
- **AND** the run SHALL not register a live controller or start a session.

### Requirement: Setup-to-live controller replacement is identity-safe

When an ACP Skill run becomes live, its setup cancellation handle SHALL be
atomically replaced by the live controller. Cleanup SHALL remove only the
controller or setup handle identity it owns and SHALL NOT remove a newer live
controller installed for the same request.

#### Scenario: Late setup cleanup cannot detach a live controller

- **GIVEN** a run transitions from setup to a live controller
- **WHEN** an earlier setup cleanup callback runs
- **THEN** the live controller SHALL remain registered
- **AND** the run SHALL retain the existing connected/recovery behavior.

### Requirement: Existing live ACP lifecycle remains unchanged

The setup lifecycle change SHALL preserve existing live cancel, interrupt,
disconnect, reply, permission, session recovery, waiting-user detach, and
workflow-apply slot semantics. Hard timeout measurement SHALL continue to begin
from prompt-ready rather than setup start.

#### Scenario: Live run retains existing controls

- **GIVEN** an ACP Skill run has created a session and registered its live
  controller
- **WHEN** the user cancels, disconnects, replies, or recovers the run
- **THEN** the existing live controller paths and persisted state transitions
  SHALL be used.

### Requirement: Terminal task and ACP conversation lifecycles are independent

ACP Skills SHALL treat `succeeded` and `failed` workflow task status as absorbing
on the task axis while allowing a separately recoverable conversation on the
original ACP session. Eligibility SHALL be derived by one classifier and SHALL
NOT be persisted as a run-record field.

#### Scenario: Eligible succeeded run can reconnect

- **GIVEN** a non-archived succeeded run has an original session, completed apply
  evidence or a legacy missing apply-state field, no workflow-open evidence, and
  a conversation that is neither ended nor unsupported
- **WHEN** the user explicitly selects Connect
- **THEN** ACP Skills SHALL resume that original session without sending a prompt
- **AND** the task SHALL remain succeeded.

#### Scenario: Eligible failed run can reconnect

- **GIVEN** a non-archived failed run has an original session, no workflow-open
  evidence, and a conversation that is neither ended nor unsupported
- **WHEN** the user explicitly selects Connect
- **THEN** ACP Skills SHALL negotiate resume or load for that session
- **AND** the original business error and failed task status SHALL remain intact.

#### Scenario: Ineligible terminal run remains closed

- **GIVEN** a run is canceled, failed_retriable, archived, ended, unavailable,
  unsupported, missing its session, or retains workflow-open evidence
- **WHEN** terminal conversation controls are derived
- **THEN** ACP Skills SHALL NOT offer post-terminal Connect or Reply.

### Requirement: Post-terminal prompts are ordinary ACP conversation turns

After explicit Connect, ACP Skills SHALL send the user's original text directly
as the prompt and SHALL retain normal ACP transcript, tool call, permission,
usage, interrupt, force-stop, timeout, and disconnect behavior. Reply SHALL NOT
implicitly connect a detached terminal run.

#### Scenario: Completion marker is ordinary transcript content

- **GIVEN** an eligible terminal run is connected for ordinary conversation
- **WHEN** the user replies and the agent emits valid `__SKILL_DONE__` JSON
- **THEN** ACP Skills SHALL record the response in the transcript
- **AND** it SHALL NOT validate or repair workflow output, write a result, advance
  a sequence, or apply output.

#### Scenario: Terminal conversation can use tools and permissions

- **GIVEN** a post-terminal prompt requests an ACP tool call that requires an
  existing Host Bridge permission decision
- **WHEN** the permission flow settles
- **THEN** the existing tool and permission policy SHALL apply
- **AND** the conversation SHALL not be restricted to read-only behavior merely
  because its workflow task is terminal.

#### Scenario: Terminal prompt failure preserves task evidence

- **GIVEN** an eligible succeeded or failed run is connected
- **WHEN** its prompt errors, is denied, interrupted, force-stopped, or times out
- **THEN** status, backend status, apply evidence, result, output revisions,
  workflow tasks, sequence state, and business error SHALL remain unchanged
- **AND** any prompt failure SHALL be recorded only on conversation or reply
  error state.

### Requirement: Terminal conversation bypasses workflow admission

Post-terminal Connect and Reply SHALL NOT acquire a submission slot, enter
resumption-pending, or participate in output convergence, apply, or sequence
continuation.

#### Scenario: Intermediate terminal sequence step converses concurrently

- **GIVEN** a sequence step has itself reached eligible terminal state while a
  later step is executing
- **WHEN** the user connects and converses with the terminal step
- **THEN** the terminal conversation SHALL proceed without a submission slot
- **AND** later steps, slot counts, and sequence state SHALL remain unchanged.

### Requirement: Initial controllers never become post-terminal controllers

Every controller created by initial workflow execution SHALL retain workflow
purpose until it is detached. Only explicit terminal Connect SHALL create a
post-terminal-conversation controller.

#### Scenario: Apply-to-detach race rejects terminal reply

- **GIVEN** workflow apply has made the run terminal but the original controller
  has not yet detached
- **WHEN** a reply is attempted through that controller
- **THEN** the reply SHALL be rejected until explicit Connect installs a new
  post-terminal controller.

### Requirement: ACP Skills setup SHALL publish readiness only after a usable session exists

ACP Skills SHALL keep a run in setup while acquiring its launch lease, starting transport, initializing ACP, attaching or creating the session, and applying the initial mode, model, and configuration. Each phase SHALL have an independent 60-second timeout. `connected` SHALL mean the session and initial runtime configuration are usable.

#### Scenario: Adapter exists before session readiness

- **WHEN** an adapter has been allocated but initialize, session setup, or initial runtime configuration is still pending
- **THEN** the run SHALL NOT publish `connected`
- **AND** cancellation SHALL remain available through the setup controller.

#### Scenario: Startup phase exceeds its limit

- **WHEN** one startup phase remains unsettled for 60 seconds
- **THEN** the run SHALL become `failed`
- **AND** diagnostics SHALL identify that phase and the 60-second timeout
- **AND** a late phase result SHALL NOT send a prompt or restore a controller.

### Requirement: ACP Skills task cancellation SHALL converge before backend cleanup

Task cancellation SHALL publish the run's terminal `canceled` state, cancel pending resumption, and notify workflow observers before awaiting backend cleanup. Cleanup SHALL be bounded and SHALL NOT delay UI convergence or Host settlement.

#### Scenario: Controller cancel never returns

- **WHEN** a user cancels a non-terminal ACP Skills task and its controller never settles
- **THEN** the run SHALL synchronously become `canceled`
- **AND** Host settlement SHALL be able to release the unit and submission identity
- **AND** cleanup timeout SHALL only produce diagnostics.

#### Scenario: Disconnect cleanup never returns

- **WHEN** a user disconnects a recoverable non-terminal run and local cleanup never settles
- **THEN** local detachment SHALL complete within the cleanup watchdog
- **AND** the run SHALL preserve its recoverable remote identity
- **AND** disconnect SHALL NOT settle the workflow unit as terminal.

### Requirement: ACP Skill run records SHALL support generic hard deletion

The ACP skill-run store SHALL expose a generic hard-delete operation that
flushes pending runtime writes, removes persisted and in-memory run records,
clears selection for deleted request ids, and emits the archive workspace
change. Replay cleanup SHALL use this operation instead of replay-specific
store helpers.

#### Scenario: Hard deletion removes every owned record atomically

- **WHEN** one or more ACP skill-run request ids are hard-deleted
- **THEN** persisted run rows and in-memory records SHALL be removed
- **AND** selection SHALL be cleared when it references a deleted request
- **AND** one archive workspace change SHALL be emitted for the deleted ids

#### Scenario: Hard deletion does not change archive or retention semantics

- **WHEN** archive or retention cleanup runs
- **THEN** their existing lifecycle behavior SHALL remain unchanged
- **AND** the hard-delete operation SHALL NOT become the default user-facing
  removal path
