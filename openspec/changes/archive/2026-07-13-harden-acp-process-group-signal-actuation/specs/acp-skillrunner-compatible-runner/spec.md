## ADDED Requirements

### Requirement: ACP Skills process-tree cleanup SHALL preserve validated signal targets
ACP Skills normal runs, recovered runs, sequence stages, terminal cleanup, and diagnostics SHALL delegate local transport teardown to the shared controller whose signal actuation preserves the complete validated process-group target.

#### Scenario: Wrapper-backed ACP Skills controller closes
- **WHEN** an ACP Skills controller requires TERM or KILL escalation
- **THEN** it SHALL use the shared validated signal boundary
- **AND** normal, recovered, sequence, and diagnostic paths MUST NOT implement independent negative-PID cleanup
