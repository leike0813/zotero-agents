## MODIFIED Requirements

### Requirement: Trace recorder is isolated and source-elided

The recorder SHALL be debug-only, SHALL have an independent hard-coded source switch, SHALL remain mutually exclusive with replay, and SHALL contribute zero runtime bytes when debug mode or its source switch is disabled. Production and source-disabled bundles SHALL also eliminate trace owner/context construction, semantic-update property reads performed only for tracing, empty recorder method calls, recorder-only runtime markers, and trace-exclusive imports from ACP hot paths. The semantic trace document/parser module MAY remain in a recorder-disabled debug build only when independently enabled Replay requires it as input validation.

#### Scenario: Capture is active

- **WHEN** a semantic trace is recording
- **THEN** runtime profiling SHALL remain disabled.

#### Scenario: Recorder source is disabled

- **WHEN** a production bundle or recorder-disabled debug bundle is built
- **THEN** recorder code, recorder-only markers, state, owner/context construction, trace-only update reads, recorder calls, and hot-path branches SHALL be absent
- **AND** shared trace schema/parser code SHALL remain only when independently enabled Replay consumes it.

#### Scenario: Real ACP entry is compiled for production

- **WHEN** release-elision verification compiles the real plugin entry with `__debug_mode__` set to false
- **THEN** every semantic-trace exclusive module, including its schema, SHALL contribute zero output bytes
- **AND** no trace recorder call or trace owner/context runtime marker SHALL remain in the output.
