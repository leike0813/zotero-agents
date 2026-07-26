# acp-skills-session-recovery Specification

## Purpose
TBD - created by archiving change recover-acp-skills-sessions-and-replies. Update Purpose after archive.
## Requirements
### Requirement: ACP Skills SHALL preserve recoverable remote sessions
ACP Skills SHALL detach local controllers on plugin shutdown without ending remote ACP sessions when a run has a session id and was not explicitly ended or canceled.

#### Scenario: Shutdown preserves session
- **GIVEN** an ACP Skill run has `sessionId`
- **WHEN** Zotero shuts down
- **THEN** the local controller is detached
- **AND** the run is marked recoverable
- **AND** the remote session is not canceled or ended.

#### Scenario: Shutdown while waiting for user reply preserves pending input
- **GIVEN** an ACP Skill workflow run is waiting for user input
- **AND** the run has a recoverable session and pending interaction
- **WHEN** Zotero shuts down
- **THEN** the local controller is detached
- **AND** the pending interaction remains available after restart
- **AND** the run is not completed as workflow apply success
- **AND** reconnect or reply can continue the same session.

#### Scenario: Recoverable failure is represented by failed retriable
- **GIVEN** an ACP Skill run has a recoverable remote session
- **WHEN** the active prompt chain fails without terminal cancellation or
  unrecoverable session loss
- **THEN** the run status SHALL be `failed_retriable`
- **AND** terminal `failed` SHALL NOT be used to represent that recoverable
  state.

### Requirement: ACP Skills SHALL recover before replying
ACP Skills SHALL attempt to restore a missing live controller before sending a reply only for statuses that are allowed by the ACP Skills run status state machine.

#### Scenario: Reply recovers controller from waiting run
- **GIVEN** a run is `waiting_user`
- **AND** it is recoverable but has no live local controller
- **WHEN** the user sends a reply
- **THEN** the runner attempts `resumeSession`
- **AND** falls back to `loadSession`
- **AND** sends the reply to the recovered session if attach succeeds.

#### Scenario: Reply recovers controller from failed retriable run
- **GIVEN** a run is `failed_retriable`
- **AND** it is recoverable but has no live local controller
- **WHEN** the user sends a reply or explicit reconnect starts continuation
- **THEN** the runner attempts to recover the original session
- **AND** successful recovery SHALL move the run to the next non-terminal state
  required by the resumed workflow.

#### Scenario: Reply does not revive terminal failed
- **GIVEN** a run has terminal status `failed`
- **WHEN** the user or Host Bridge attempts to reply or reconnect
- **THEN** ACP Skills SHALL reject the action or report it unsupported
- **AND** the terminal run status SHALL remain `failed`.

### Requirement: ACP Skills Preserve Continuation Context On Recovered Workflow Replies

ACP Skills SHALL wrap replies sent after recovery with a continuation guard
built from persisted runtime files rather than from long-lived controller
closure state when a recoverable workflow has not completed apply.

#### Scenario: Recovered workflow reply uses file-backed continuation guard

- **GIVEN** an ACP Skill run has status `waiting_user` or `failed_retriable`
- **AND** it has a recoverable remote session and a non-terminal workflow task
- **AND** the live controller has been lost, detached, or reduced to a thin live
  session handle
- **WHEN** the user sends a reply and recovery succeeds
- **THEN** the runner sends the reply to the original `sessionId`
- **AND** the backend prompt includes a continuation guard identifying the same
  ACP Skills run and same remote ACP session
- **AND** the guard is built from persisted runtime files such as
  `run-context.json`, the input manifest, and result path metadata
- **AND** recovery SHALL NOT require request, runner, materialization, or prompt
  builder objects to be retained in the controller closure.

#### Scenario: Recovered succeeded conversation does not use workflow guard
- **GIVEN** workflow apply already succeeded for an ACP Skill run
- **WHEN** the user sends a follow-up reply after recovery
- **THEN** the runner sends the user text to the recovered session without the workflow continuation guard
- **AND** workflow apply is not triggered again.

#### Scenario: Terminal failed conversation does not use workflow guard
- **GIVEN** an ACP Skill run has terminal status `failed`
- **WHEN** reconnect or reply is attempted
- **THEN** ACP Skills SHALL NOT send a recovered workflow continuation guard
- **AND** workflow apply or sequence continuation SHALL NOT restart.

### Requirement: ACP Skills SHALL expose connection controls
The ACP Skills panel SHALL show current connection/recovery state and provide Connect and Disconnect controls.

#### Scenario: Explicit connect
- **GIVEN** a selected run is recoverable
- **WHEN** the user clicks Connect
- **THEN** ACP Skills restores the session without sending a reply.

### Requirement: ACP Skills replies SHALL be observable
ACP Skills SHALL record reply receipt, acceptance, and rejection events.

#### Scenario: Reply action is visible
- **WHEN** the user submits a reply
- **THEN** the run records `reply-submitted`
- **AND** records either `reply-accepted` or a visible failure event.

### Requirement: ACP Skills recovery SHALL keep forensic evidence out of the UI transcript
ACP Skills SHALL keep user-facing transcript text separate from backend prompt wrappers.

#### Scenario: Backend prompt wrapper is not displayed as user text
- **GIVEN** a recovered workflow reply is wrapped with a continuation guard
- **WHEN** the ACP Skills transcript is rendered
- **THEN** the user message shows the original user reply
- **AND** the continuation guard is not rendered as the user-facing message body
- **AND** backend transcripts or diagnostics MAY retain the full wrapped prompt for investigation.

### Requirement: ACP Skills recovery SHALL restore run-scoped Host Bridge CLI access

ACP Skills SHALL reconstruct the run's Zotero host-access policy and prepare the run-scoped Host Bridge CLI environment before dependency probing or adapter creation for a recovered conversation. Recovery SHALL obtain current transient credentials instead of restoring a plaintext token from persisted run state.

#### Scenario: Required host access is reapplied before adapter creation

- **GIVEN** an ACP Skill run has a recoverable remote session
- **AND** its effective request requires Zotero host access
- **WHEN** ACP Skills restores the missing local controller
- **THEN** it SHALL rematerialize the Host Bridge profile and CLI shims in the run workspace
- **AND** it SHALL inject `ZOTERO_BRIDGE_PROFILE`, `ZOTERO_BRIDGE_TOKEN`, `PATH`, and `Path` into the backend before runtime dependency probing
- **AND** the recovered adapter SHALL receive the backend produced by that dependency path.

#### Scenario: Recovery preserves write auto-approval policy

- **GIVEN** the recovered run's effective request enables `zotero_host_access.auto_approve_writes`
- **WHEN** ACP Skills prepares Host Bridge CLI access for recovery
- **THEN** it SHALL request a replacement run-scoped write auto-approval grant
- **AND** the recovered profile SHALL identify that policy for the same request ID.

#### Scenario: Explicitly disabled host access remains disabled

- **GIVEN** the recovered run's effective request declares `zotero_host_access.required: false`
- **WHEN** ACP Skills restores the local controller
- **THEN** it SHALL NOT materialize Host Bridge CLI access
- **AND** it SHALL NOT inject a Host Bridge profile or token into the recovered backend.

#### Scenario: Missing request uses the safe recovery default

- **GIVEN** neither the run record nor file-backed context contains the original ACP Skill request
- **WHEN** ACP Skills restores the local controller
- **THEN** it SHALL default Zotero host access to required
- **AND** it SHALL default write auto-approval to disabled.

#### Scenario: Recovered token remains transient

- **WHEN** recovery obtains and injects the current Host Bridge token
- **THEN** canonical run state and events SHALL contain only the masked Host Bridge summary
- **AND** they SHALL NOT contain the plaintext token.

#### Scenario: Host Bridge preparation failure settles recovery state

- **WHEN** recovery-time Host Bridge preparation throws an error
- **THEN** ACP Skills SHALL mark conversation recovery as failed
- **AND** it SHALL clear the connecting action state
- **AND** it SHALL NOT create the recovered adapter.
