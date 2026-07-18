## ADDED Requirements

### Requirement: ACP adapter diagnostics are observational rather than canonical run lifecycle

ACP Skills SHALL route adapter diagnostics to bounded runtime evidence without using them as canonical run events, transcript events, or lifecycle state transitions.

#### Scenario: Information diagnostic does not mutate canonical state
- **WHEN** an active or recovered ACP Skills run observes any number of info or JSON-RPC trace diagnostics
- **THEN** the diagnostics MUST NOT modify run status, `updatedAt`, event history, transcript, result, permission, or recovery state
- **AND** they MUST NOT write a canonical run row or run-event row
- **AND** they MUST NOT publish run, transcript, progress, or other business Workspace changes.

#### Scenario: Warning and error diagnostics remain available without becoming business state
- **WHEN** an adapter emits a warning or error diagnostic
- **THEN** sanitized evidence MAY be written to the bounded request-scoped runtime log
- **AND** debug mode MAY additionally enqueue sanitized audit evidence
- **AND** neither sink may alter or block ACP run execution state.

#### Scenario: Business boundaries retain their explicit persistence owners
- **WHEN** prompt failure, permission, authentication, connection close, cancellation, interruption, apply, result, or terminal state occurs
- **THEN** the existing explicit business handler MUST persist that state independently of any adapter diagnostic
- **AND** removing diagnostic persistence MUST NOT suppress the business transition.

#### Scenario: Historical diagnostic events remain readable
- **WHEN** a stored run predating this requirement contains adapter diagnostic events
- **THEN** the reader MUST tolerate and expose the stored history without migration
- **AND** newly observed adapter diagnostics MUST NOT be appended to that history.

## MODIFIED Requirements

### Requirement: Plugin-owned ACP audit streams are physically batched

Debug-only plugin-owned `timeline.ndjson`, `acp-updates.ndjson`, and `transport.ndjson` streams SHALL preserve ordered sanitized logical records during normal operation while using bounded low-frequency true append operations. Under sustained sink failure or backpressure beyond the audit-only hard limit, the plugin MAY drop the oldest pending audit records with observable drop counters; this policy MUST NOT apply to transcript or other business persistence channels.

#### Scenario: Audit burst appends one batch without whole-file rewrite

- **GIVEN** ACP debug mode is enabled
- **WHEN** many audit records are emitted for one owner and file before a forced boundary
- **THEN** every retained logical record SHALL remain independently readable in order
- **AND** the plugin SHALL append the pending batch without reading and rewriting the existing complete file
- **AND** physical writes SHALL be bounded by the configured time, byte, entry, and durability thresholds.

#### Scenario: Audit enqueue does not await timer durability

- **WHEN** an adapter session update or transport callback enqueues an audit record
- **THEN** the callback SHALL be able to continue without waiting for the trailing flush timer
- **AND** the record SHALL remain pending until a threshold, audit boundary, or audit-only hard limit processes it.

#### Scenario: Audit failure is best-effort and bounded

- **WHEN** one physical audit append fails
- **THEN** the run SHALL continue
- **AND** one structured audit failure SHALL be recorded for that attempt
- **AND** pending logical records SHALL remain available for retry only within the configured audit hard limits
- **AND** overflow SHALL be represented by dropped-entry, dropped-byte, and overflow-episode diagnostics.

