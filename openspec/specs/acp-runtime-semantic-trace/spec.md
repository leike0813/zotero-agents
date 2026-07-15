# acp-runtime-semantic-trace Specification

## Purpose
Source-bound, lossless semantic trace capture for ACP runtime sessions. The recorder persists complete semantic event streams (Chat and Workflow) as local NDJSON traces that serve as the input for backend-free replay profiling. Traces are debug-only, isolated from the production code path, and expose no egress workflow.

## Requirements

### Requirement: Semantic traces are source-bound and lossless

The recorder SHALL persist `zotero-agents.acp-runtime-semantic-trace.v1` traces with exactly one source kind, exactly one `root-start`/`root-end` pair, at least one complete turn or request activity, consecutive sequence numbers, monotonic offsets, logical owners, and discriminated lifecycle, notification, diagnostic, permission, terminal, and connection-close events. It SHALL NOT persist transport authorization, claim tokens, activity registries, or derived transcript boundaries.

#### Scenario: Armed recorder observes unclaimed events
- **WHEN** semantic events arrive before an eligible root is explicitly claimed
- **THEN** the recorder SHALL ignore them without freezing or persisting them.

#### Scenario: Complete Chat session is recorded
- **WHEN** an armed Chat recorder claims the first successful eligible explicit connection and observes one or more complete turns
- **THEN** the unique root start owner and payload SHALL identify backend, conversation, and remote session
- **AND** only complete prompts, `SessionNotification` payloads, permission outcomes, terminal events, and other semantic events for that remote session SHALL be retained through the unique root end
- **AND** replay SHALL recompute transcript boundaries using the shared classifier.

#### Scenario: Complete Workflow execution is recorded
- **WHEN** an armed Workflow recorder claims a new top-level execution containing executable ACP requests
- **THEN** all ordinary and sequence request activities SHALL share the canonical execution root
- **AND** request ordering, ownership, payloads, terminals, and aggregate execution outcome SHALL be retained.

#### Scenario: Host has no high-resolution performance clock
- **WHEN** the privileged Zotero scope does not expose `globalThis.performance`
- **THEN** recording SHALL use a host-safe fallback clock
- **AND** persisted monotonic offsets SHALL remain finite and nondecreasing.

### Requirement: Recorder completeness is explicit

The recorder SHALL implement `idle`, `armed`, `recording`, `stopping`, `frozen`, and `saved` states. Arming SHALL create a new opaque round. Eligible producers SHALL begin scoped claim attempts, and the first successful live attempt SHALL atomically claim the root. Reset or cancellation SHALL invalidate all old attempts and event authority. `finishRoot` SHALL defer while registered activity remains, reject new activity, and freeze complete only after appending one root end and validating at least one complete activity. Quota, write, or integrity failures and user cancellation SHALL freeze incomplete.

#### Scenario: Concurrent claim attempts complete
- **WHEN** multiple eligible attempts exist for one armed round
- **THEN** the first successful live claim SHALL win atomically
- **AND** later, failed, or stale attempts SHALL not replace the binding or append events.

#### Scenario: Finish is requested during a turn
- **WHEN** a complete-eligible Chat recording has an active registered turn
- **THEN** it SHALL enter `stopping`, refuse another turn, and finish automatically after that turn becomes terminal.

#### Scenario: Empty session is finished
- **WHEN** no complete activity has been recorded
- **THEN** completion SHALL remain unavailable and only incomplete cancellation SHALL be allowed.

#### Scenario: Recording is canceled
- **WHEN** the user cancels an armed, recording, or stopping round
- **THEN** buffered writes SHALL drain, an incomplete footer with `user-canceled` SHALL be appended, diagnostic ownership SHALL be released, and the partial file SHALL remain local
- **AND** the user SHALL be able to reset and arm another round.

#### Scenario: Saved round is reset
- **WHEN** a complete trace has been saved and the user starts a new recording round
- **THEN** recorder ownership, claim authority, activity registries, and counters SHALL be reset without deleting or modifying the saved trace.

#### Scenario: Recorder setup fails
- **WHEN** recorder initialization fails after acquiring diagnostic ownership
- **THEN** ownership SHALL be released and the Dashboard SHALL expose a recoverable state without requiring a host restart.

#### Scenario: Recorder exceeds a quota
- **WHEN** the trace reaches its configured byte, event, or per-event limit
- **THEN** recording SHALL freeze immediately as incomplete
- **AND** no observed event SHALL be silently discarded while recording continues.

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

### Requirement: Raw traces expose no egress workflow

The Dashboard SHALL warn that traces can contain sensitive content and expose recorder state, structured binding, active activity count, completion availability, and non-fatal notices without exposing claim authority. It SHALL distinguish waiting for an explicit connection, connecting, bound recording, and waiting for active work to finish. It SHALL provide only arm, cancel, finish/deferred finish, reset, save, and local-folder operations; SHALL NOT provide clipboard, upload, submission, or automatic deletion actions; and SHALL NOT publish recorder state into Assistant Workspace snapshots or render signatures.

#### Scenario: Remote Chat session is replaced
- **WHEN** a later explicit reconnect obtains a different remote session from the recorded binding
- **THEN** recording SHALL remain bound to the original session
- **AND** Dashboard SHALL show a non-fatal replacement notice without exposing the new session's events.

#### Scenario: Canceled trace is displayed
- **WHEN** a recording is canceled
- **THEN** the UI SHALL identify the trace as incomplete, expose its local partial path, and offer a new recording round without a deletion action.
