## ADDED Requirements

### Requirement: Synthesis maintenance SHALL expose safe status and constrained invalidation

Synthesis maintenance controls SHALL provide agent-readable status and approval-gated invalidation without exposing raw debug reset controls.

#### Scenario: Status is read-only

- **WHEN** a client requests synthesis cache or index status
- **THEN** the response contains lightweight health, freshness, and availability summaries
- **AND** no cache or index state is mutated.

#### Scenario: Invalidation rejects unsupported scopes

- **WHEN** a client requests cache invalidation for an unsupported scope
- **THEN** the operation fails with a stable `unsupported_cache_scope` error
- **AND** no debug reset, SQL, JS, path, or arbitrary table operation is executed.
