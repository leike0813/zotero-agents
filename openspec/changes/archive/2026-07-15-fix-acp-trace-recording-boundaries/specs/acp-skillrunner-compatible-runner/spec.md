## ADDED Requirements

### Requirement: ACP Skills trace context is transient and identity-neutral

ACP Skills ordinary requests and sequence steps SHALL carry transient debug-only parent workflow recording context separately from `AcpSkillRunRecord.runId`, `requestId`, sequence composite identity, and Host Bridge run identity. The context SHALL authorize activity publication only while its matching recorder round and claimed root remain live, and SHALL never be persisted or exposed through provider or Host Bridge protocols.

#### Scenario: Ordinary ACP request is recorded
- **WHEN** a concrete request starts under a claimed top-level workflow execution
- **THEN** its start, semantic events, and terminal SHALL be recorded under that execution root
- **AND** its public and persistent run identities SHALL remain unchanged.

#### Scenario: Stale request terminal arrives
- **WHEN** a terminal from an invalidated recording round or a different root arrives
- **THEN** it SHALL not close current activity or append to the current trace.

#### Scenario: Concrete terminal settles
- **WHEN** a registered request becomes terminal through success, failure, cancellation, or forced cleanup
- **THEN** exactly one matching request end SHALL close that activity before workflow-root completion.
