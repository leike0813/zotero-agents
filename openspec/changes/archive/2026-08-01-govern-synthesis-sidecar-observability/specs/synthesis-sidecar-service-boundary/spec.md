## MODIFIED Requirements

### Requirement: Service diagnostics SHALL use the internal debug wire only

The sidecar request envelope MAY contain v2 trace context only in debug mode.
Rust SHALL reject invalid or unknown trace-context fields and SHALL return
production failures through the existing RPC result and process state.

#### Scenario: Trace context is absent
- **WHEN** debug mode is disabled
- **THEN** the request bytes remain free of observation fields
