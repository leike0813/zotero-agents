## MODIFIED Requirements

### Requirement: Trace persistence is bounded, atomic, and local

The default limits SHALL be 256 MiB, 250,000 events, and 16 MiB per event, with only lower pre-start Dashboard overrides. Records SHALL stream as buffered NDJSON to a permission-restricted `.partial` file and SHALL be atomically renamed only after sequence, count, byte, SHA-256, and footer validation. Default filenames SHALL identify the armed source as `acp-trace-chat-*` for Chat conversation traces or `acp-trace-skills-*` for ACP Skills workflow traces.

#### Scenario: Partial file survives a crash
- **WHEN** the host exits before finalization
- **THEN** the `.partial` file SHALL remain available for recovery diagnostics
- **AND** it SHALL NOT be accepted as a complete baseline trace.

#### Scenario: Corrupt trace is loaded
- **WHEN** sequence, footer, count, byte, or digest validation fails
- **THEN** the trace SHALL be rejected with a structured validation result.

#### Scenario: Recorder creates a source-identifiable path
- **WHEN** a recorder is armed for Chat or ACP Skills before any root binding exists
- **THEN** its partial and saved filename SHALL contain the corresponding `chat` or `skills` source token
- **AND** timestamp, collision nonce, permissions, and atomic finalization behavior SHALL remain unchanged.
