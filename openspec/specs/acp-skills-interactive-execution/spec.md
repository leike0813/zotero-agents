# acp-skills-interactive-execution Specification

## Purpose
TBD - created by archiving change add-acp-skills-interactive-execution. Update Purpose after archive.
## Requirements
### Requirement: ACP Skill Runs Keep A Live Conversation After Workflow Success

When an ACP Skill run validates a final assistant turn payload, the provider result SHALL be returned for workflow apply while the ACP session remains available for follow-up conversation.

#### Scenario: Success Keeps Conversation Active

- **GIVEN** an ACP Skill run has produced a valid assistant turn payload with `__SKILL_DONE__: true`
- **WHEN** the runner returns a succeeded provider result
- **THEN** the run status is `succeeded`
- **AND** the conversation state remains `active`
- **AND** the live run controller can accept a text reply.

### Requirement: ACP Skill Interactive Pending Turns Do Not Trigger Apply

Interactive ACP Skill runs SHALL treat `__SKILL_DONE__: false` turn payloads as waiting-user state, not as workflow completion.

#### Scenario: Pending Turn Waits For User Reply

- **GIVEN** an interactive ACP Skill run returns a schema-valid payload with `__SKILL_DONE__: false`
- **WHEN** the runner converges the assistant turn
- **THEN** the run status is `waiting_user`
- **AND** `result/result.json` is not written
- **AND** workflow apply is not triggered
- **AND** the reply composer can continue the same ACP session.

### Requirement: ACP Skill Result Envelope Is Runner-Generated

ACP Skills SHALL write `result/result.json` only after final turn convergence; agents SHALL NOT be instructed to write that file as the completion signal.

#### Scenario: Final Turn Produces Result Envelope

- **GIVEN** an assistant turn returns a schema-valid payload with `__SKILL_DONE__: true`
- **WHEN** the runner validates the final output fields
- **THEN** the runner strips `__SKILL_DONE__`
- **AND** writes the remaining final payload to `result/result.json`
- **AND** returns that payload as `ProviderExecutionResult.resultJson`.

### Requirement: ACP Skill Replies Reuse The Same ACP Session
Plain-text replies from the ACP Skills panel SHALL be sent as additional `session/prompt` requests on the existing ACP session. If the local controller is missing but the run has a recoverable `sessionId`, ACP Skills SHALL restore that remote session before sending the reply.

#### Scenario: Reply After Local Controller Loss
- **GIVEN** a recoverable ACP Skill run has no live local controller
- **WHEN** the user sends a reply
- **THEN** ACP Skills restores the persisted remote session
- **AND** sends the reply to the same `sessionId`
- **AND** does not create a replacement session.

### Requirement: ACP Skill Apply Is Single-Shot

Automatic Zotero writeback SHALL happen only from the first validated workflow result for the run.

#### Scenario: Follow-Up Does Not Reapply

- **GIVEN** workflow apply already succeeded for an ACP Skill run
- **WHEN** additional agent messages or tool calls occur in the same conversation
- **THEN** the run transcript is updated
- **AND** the workflow apply seam is not invoked again for that follow-up.

