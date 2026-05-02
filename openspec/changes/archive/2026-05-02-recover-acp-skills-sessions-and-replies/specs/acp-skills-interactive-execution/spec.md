# ACP Skills Interactive Execution

## MODIFIED Requirements

### Requirement: ACP Skill Replies Reuse The Same ACP Session
Plain-text replies from the ACP Skills panel SHALL be sent as additional `session/prompt` requests on the existing ACP session. If the local controller is missing but the run has a recoverable `sessionId`, ACP Skills SHALL restore that remote session before sending the reply.

#### Scenario: Reply After Local Controller Loss
- **GIVEN** a recoverable ACP Skill run has no live local controller
- **WHEN** the user sends a reply
- **THEN** ACP Skills restores the persisted remote session
- **AND** sends the reply to the same `sessionId`
- **AND** does not create a replacement session.
