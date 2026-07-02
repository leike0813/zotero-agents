## MODIFIED Requirements

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
