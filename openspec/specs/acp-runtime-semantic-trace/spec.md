# acp-runtime-semantic-trace Specification

## Purpose
Source-bound, lossless semantic trace capture for ACP runtime sessions. The recorder persists complete semantic event streams (Chat and Workflow) as local NDJSON traces that serve as the input for backend-free replay profiling. Traces are debug-only, isolated from the production code path, and expose no egress workflow.

## Requirements

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

The recorder SHALL implement `idle`, `armed`, `recording`, `frozen`, and `saved` states. Unowned events, mid-turn binding, active owners at stop, write failures, quota failures, integrity failures, or user cancellation SHALL freeze an incomplete trace that is ineligible for baseline replay. Frozen and saved rounds SHALL expose a reset operation that releases runtime ownership and permits another round without restarting Zotero.

#### Scenario: Recording is canceled
- **WHEN** the user cancels an armed or recording round
- **THEN** buffered writes SHALL drain, an incomplete footer with `user-canceled` SHALL be appended, diagnostic ownership SHALL be released, and the partial file SHALL remain local
- **AND** the user SHALL be able to reset and arm another round.

#### Scenario: Saved round is reset
- **WHEN** a complete trace has been saved and the user starts a new recording round
- **THEN** recorder ownership and counters SHALL be reset without deleting or modifying the saved trace.

#### Scenario: Recorder setup fails
- **WHEN** recorder initialization fails after acquiring diagnostic ownership
- **THEN** ownership SHALL be released and the Dashboard SHALL expose a recoverable state without requiring a host restart.

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

The Dashboard SHALL warn that traces can contain sensitive content and SHALL provide only start, stop, cancel, reset, save, and local-folder operations. It SHALL NOT provide clipboard, upload, submission, or automatic deletion actions.

#### Scenario: Canceled trace is displayed
- **WHEN** a recording is canceled
- **THEN** the UI SHALL identify the trace as incomplete, expose its local partial path, and offer a new recording round without a deletion action.
