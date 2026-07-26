## ADDED Requirements

### Requirement: Semantic traces are source-bound and lossless

The recorder SHALL persist `zotero-agents.acp-runtime-semantic-trace.v1` traces with exactly one source kind, complete semantic payloads, consecutive sequence numbers, monotonic offsets, logical owners, and discriminated lifecycle, notification, diagnostic, permission, terminal, and connection-close events. It SHALL NOT persist transport authorization or derived transcript boundaries.

#### Scenario: Complete Chat conversation is recorded
- **WHEN** a recorder armed for Chat binds the first complete matching conversation root and observes multiple turns
- **THEN** all prompts, complete `SessionNotification` payloads, permission outcomes, and terminal events SHALL be retained without truncation or redaction
- **AND** replay SHALL recompute transcript boundaries using the shared classifier.

#### Scenario: Workflow hierarchy is recorded
- **WHEN** a recorder armed for Workflow binds an execution containing multiple interleaved stage requests
- **THEN** the root, request hierarchy, ordering, ownership, and complete semantic payloads SHALL be retained.

#### Scenario: Host has no high-resolution performance clock
- **WHEN** the privileged Zotero scope does not expose `globalThis.performance`
- **THEN** recording SHALL use a host-safe fallback clock
- **AND** persisted monotonic offsets SHALL remain finite and nondecreasing.

### Requirement: Recorder completeness is explicit

The recorder SHALL implement `idle`, `armed`, `recording`, `frozen`, and `saved` states. Unowned events, mid-turn binding, active owners at stop, write failures, quota failures, or integrity failures SHALL freeze an incomplete trace that is ineligible for baseline replay.

#### Scenario: Recorder exceeds a quota
- **WHEN** the trace reaches its configured byte, event, or per-event limit
- **THEN** recording SHALL freeze immediately as incomplete
- **AND** no observed event SHALL be silently discarded while recording continues.

#### Scenario: Clean stop
- **WHEN** all bound turns and requests are terminal and the user stops recording
- **THEN** the recorder SHALL flush and validate the trace before it becomes complete and saveable.

### Requirement: Trace persistence is bounded, atomic, and local

The default limits SHALL be 256 MiB, 250,000 events, and 16 MiB per event, with only lower pre-start Dashboard overrides. Records SHALL stream as buffered NDJSON to a permission-restricted `.partial` file and SHALL be atomically renamed only after sequence, count, byte, SHA-256, and footer validation.

#### Scenario: Partial file survives a crash
- **WHEN** the host exits before finalization
- **THEN** the `.partial` file SHALL remain available for recovery diagnostics
- **AND** it SHALL NOT be accepted as a complete baseline trace.

#### Scenario: Corrupt trace is loaded
- **WHEN** sequence, footer, count, byte, or digest validation fails
- **THEN** the trace SHALL be rejected with a structured validation result.

### Requirement: Trace recorder is isolated and source-elided

The recorder SHALL be debug-only, SHALL have an independent hard-coded source switch, SHALL remain mutually exclusive with replay, and SHALL contribute zero runtime bytes when debug mode or its source switch is disabled.

#### Scenario: Capture is active
- **WHEN** a semantic trace is recording
- **THEN** runtime profiling SHALL remain disabled.

#### Scenario: Recorder source is disabled
- **WHEN** a production bundle or recorder-disabled debug bundle is built
- **THEN** recorder code, schema markers, state, and hot-path branches SHALL be absent.

### Requirement: Raw traces expose no egress workflow

The Dashboard SHALL warn that traces can contain sensitive content and SHALL provide only start/stop/freeze/save and local-folder operations. It SHALL NOT provide clipboard, upload, submission, or automatic deletion actions.

#### Scenario: Frozen trace is displayed
- **WHEN** a trace reaches frozen state
- **THEN** the UI SHALL show completeness, quotas, integrity, and sensitivity status without exposing a copy action.
