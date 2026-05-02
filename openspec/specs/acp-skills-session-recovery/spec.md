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

### Requirement: ACP Skills SHALL recover before replying
ACP Skills SHALL attempt to restore a missing live controller before sending a reply.

#### Scenario: Reply recovers controller
- **GIVEN** a run is recoverable but has no live controller
- **WHEN** the user sends a reply
- **THEN** the runner attempts `resumeSession`
- **AND** falls back to `loadSession`
- **AND** sends the reply to the recovered session if attach succeeds.

### Requirement: ACP Skills SHALL preserve continuation context on recovered workflow replies
When a recoverable ACP Skill workflow has not completed apply, replies sent after recovery SHALL be wrapped with a continuation guard before being sent to the ACP backend.

#### Scenario: Recovered workflow reply uses continuation guard
- **GIVEN** an ACP Skill run has a recoverable remote session and a non-terminal workflow task
- **AND** the live controller has been lost or detached
- **WHEN** the user sends a reply and recovery succeeds
- **THEN** the runner sends the reply to the original `sessionId`
- **AND** the backend prompt includes a continuation guard identifying the same ACP Skills run and same remote ACP session
- **AND** the guard includes the run workspace, input manifest, requested skill, execution mode, and output-contract reminder
- **AND** the guard instructs the agent not to restart the task, discard prior work, or switch skills.

#### Scenario: Recovered succeeded conversation does not use workflow guard
- **GIVEN** workflow apply already succeeded for an ACP Skill run
- **WHEN** the user sends a follow-up reply after recovery
- **THEN** the runner sends the user text to the recovered session without the workflow continuation guard
- **AND** workflow apply is not triggered again.

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

