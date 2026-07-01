## MODIFIED Requirements

### Requirement: Agent-run may materialize request context without execution

Agent-owned workflow handoff SHALL be allowed to execute workflow request
materialization hooks for context while remaining non-executing.

#### Scenario: buildRequest is context-only during agent-run

- **WHEN** Host Bridge handles `workflow agent-run`
- **THEN** it MAY execute `buildRequest` or declarative request compilation
- **AND** the resulting payload SHALL be used only for handoff context and later
  apply-back request reconstruction
- **AND** Host Bridge SHALL NOT submit that payload to any backend during handoff.
