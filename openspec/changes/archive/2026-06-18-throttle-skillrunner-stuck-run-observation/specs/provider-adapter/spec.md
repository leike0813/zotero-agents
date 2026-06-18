## ADDED Requirements

### Requirement: SkillRunner provider polling MUST use absolute deadlines

SkillRunner provider polling MUST enforce a fixed elapsed deadline for each poll operation. Non-terminal backend responses MUST NOT reset the operation deadline.

#### Scenario: unchanged non-terminal responses do not reset timeout

- **GIVEN** provider execution is polling a SkillRunner request
- **WHEN** `/v1/jobs/{request_id}` repeatedly returns non-terminal `queued` or `running`
- **THEN** provider polling MUST stop when the configured poll timeout elapses from the original poll start
- **AND** provider polling MUST NOT extend the deadline merely because each response arrived successfully

#### Scenario: poll timeout remains recoverable after request creation

- **GIVEN** provider execution has already created a SkillRunner `requestId`
- **WHEN** provider polling reaches its absolute timeout while the backend remains non-terminal
- **THEN** foreground execution MUST preserve the request context for reconciler ownership
- **AND** plugin MUST treat the timeout as recoverable communication/availability uncertainty
- **AND** plugin MUST NOT fabricate terminal `failed` solely because of the timeout

#### Scenario: terminal response still stops polling immediately

- **WHEN** SkillRunner provider polling observes backend terminal `succeeded`, `failed`, or `canceled`
- **THEN** provider polling MUST stop immediately
- **AND** terminal ownership rules from existing SkillRunner provider requirements MUST remain unchanged
