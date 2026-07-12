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
that remote session before sending the reply.

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

ACP Skills SHALL support archiving terminal runs without deleting persisted run diagnostics, logs, workspace artifacts, result artifacts, or transcript records.

Archived runs SHALL be hidden from the default ACP Skills Runs drawer and selected-run snapshot.

ACP Skills `Cancel Run` SHALL remain a non-terminal run lifecycle action and SHALL NOT be used to archive terminal runs.

#### Scenario: Terminal ACP Skills run is archived

- **Given** an ACP Skills run has terminal status
- **When** the user activates the Archive item action for that run
- **Then** the run record is marked with `archivedAt`
- **And** the run no longer appears in default ACP Skills panel snapshots
- **And** the run record and diagnostics remain persisted.

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

#### Scenario: Skill turn returns a non-cancelled result
- **WHEN** the original prompt returns a non-cancelled result after interruption was requested
- **THEN** the run MUST set the interruption state to `unconfirmed`
- **AND** it MUST process the real result through the existing convergence or failure path.

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

