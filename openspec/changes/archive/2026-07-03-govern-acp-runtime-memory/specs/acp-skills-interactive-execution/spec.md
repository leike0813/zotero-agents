## MODIFIED Requirements

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
