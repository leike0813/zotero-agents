## MODIFIED Requirements

### Requirement: ACP Skills SHALL preserve recoverable remote sessions

ACP Skills SHALL detach local controllers on plugin shutdown without ending
remote ACP sessions when a run has a session id and was not explicitly ended or
canceled.

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

ACP Skills SHALL attempt to restore a missing live controller before sending a
reply only for statuses that are allowed by the ACP Skills run status state
machine.

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

### Requirement: ACP Skills SHALL preserve continuation context on recovered workflow replies

ACP Skills SHALL wrap recovered workflow replies or continuations with a
continuation guard when the workflow has not completed apply. Terminal runs
SHALL NOT receive recovered workflow continuation guards.

#### Scenario: Recovered workflow reply uses continuation guard
- **GIVEN** an ACP Skill run has status `waiting_user` or `failed_retriable`
- **AND** it has a recoverable remote session and a non-terminal workflow task
- **AND** the live controller has been lost or detached
- **WHEN** the user sends a reply and recovery succeeds
- **THEN** the runner sends the reply to the original `sessionId`
- **AND** the backend prompt includes a continuation guard identifying the same
  ACP Skills run and same remote ACP session
- **AND** the guard includes the run workspace, input manifest, requested skill,
  execution mode, and output-contract reminder
- **AND** the guard instructs the agent not to restart the task, discard prior
  work, or switch skills.

#### Scenario: Recovered succeeded conversation does not use workflow guard
- **GIVEN** workflow apply already succeeded for an ACP Skill run
- **WHEN** the user sends a follow-up reply after recovery
- **THEN** the runner sends the user text to the recovered session without the
  workflow continuation guard
- **AND** workflow apply is not triggered again.

#### Scenario: Terminal failed conversation does not use workflow guard
- **GIVEN** an ACP Skill run has terminal status `failed`
- **WHEN** reconnect or reply is attempted
- **THEN** ACP Skills SHALL NOT send a recovered workflow continuation guard
- **AND** workflow apply or sequence continuation SHALL NOT restart.
