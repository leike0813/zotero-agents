## ADDED Requirements

### Requirement: Debug commands SHALL remain complete but progressively disclosed

Every accepted debug leaf command SHALL appear in Agent Surface v2 with backend-aligned read, approval, danger, state-change, and recovery facts, while ordinary intent search SHALL not recommend diagnostic commands by default.

#### Scenario: Debug inventory is generated
- **WHEN** the Rust CLI accepts global or Synthesis debug commands
- **THEN** the generated Agent Surface SHALL include every accepted leaf command, including snapshot, inspect, operations, profiler, cache, and clean-install-reset commands.

#### Scenario: Read-only diagnostic is described
- **WHEN** a debug command only reads diagnostics
- **THEN** its descriptor SHALL identify no Host Bridge UI approval and no state change.

#### Scenario: Dangerous diagnostic is described
- **WHEN** a debug command can invalidate, repair, reset, or otherwise change Host state
- **THEN** its descriptor SHALL identify the backend-owned approval and confirmation boundary and safe recovery actions.
