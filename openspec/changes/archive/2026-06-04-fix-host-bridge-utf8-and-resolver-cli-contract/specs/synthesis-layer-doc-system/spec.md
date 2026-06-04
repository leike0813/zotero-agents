## ADDED Requirements

### Requirement: Active Synthesis docs SHALL match executable resolver contracts
Active documentation and agent-facing prompt text SHALL describe the same `synthesis.resolve_resolver` input shape used by Host Bridge, MCP, and CLI code.

#### Scenario: Docs show resolver wrapper object
- **WHEN** a reader consults CLI, MCP, or Synthesis resolver documentation
- **THEN** examples SHALL show a top-level `resolver` field
- **AND** active docs SHALL NOT present `topic_resolver` as a valid Host Bridge or CLI resolver input.
