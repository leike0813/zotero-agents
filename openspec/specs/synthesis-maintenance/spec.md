## Purpose

Synthesis maintenance is explicit and observable; it is not a background worker subsystem.

## Requirements

### Requirement: Maintenance is explicit operation only
Synthesis maintenance SHALL run only as explicit user/debug operations or bounded workflow apply sidecar sync.

#### Scenario: Maintenance status is read
- **WHEN** UI or Host Bridge reads maintenance state
- **THEN** it SHALL return explicit operation status and cache diagnostics
- **AND** it SHALL NOT expose background worker queue state.

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
