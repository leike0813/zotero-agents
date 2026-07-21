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
