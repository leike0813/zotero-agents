## ADDED Requirements

### Requirement: Pi correlations survive log normalization and filtering

The pipeline SHALL preserve and filter optional Pi conversationId, skillRunId, sessionId, turnId, invocationId, callId and failureId fields through normalization, persistence hydration and diagnostic projection. Owner audit SHALL reuse normalization without entering the global retention sink. Existing log producers and ACP behavior SHALL remain unchanged.

#### Scenario: Owner correlation round trip

- **WHEN** a structural Pi log is normalized, retained, hydrated and queried by invocation or owner identity
- **THEN** its safe identities remain available and another owner's logs are not returned
