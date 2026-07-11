## ADDED Requirements

### Requirement: Plugin-owned ACP audit streams are physically batched

Debug-only plugin-owned `timeline.ndjson`, `acp-updates.ndjson`, and `transport.ndjson` streams SHALL retain every sanitized logical record while using bounded low-frequency true append operations.

#### Scenario: Audit burst appends one batch without whole-file rewrite

- **GIVEN** ACP debug mode is enabled
- **WHEN** many audit records are emitted for one owner and file before a forced boundary
- **THEN** every logical record SHALL remain independently readable in order
- **AND** the plugin SHALL append the pending batch without reading and rewriting the existing complete file
- **AND** physical writes SHALL be bounded by the configured time, byte, entry, and durability thresholds.

#### Scenario: Audit enqueue does not await timer durability

- **WHEN** an adapter session update or transport callback enqueues an audit record
- **THEN** the callback SHALL be able to continue without waiting for the trailing flush timer
- **AND** the record SHALL remain pending until a threshold or audit boundary drains it.

#### Scenario: Audit failure is best-effort and retryable

- **WHEN** one physical audit append fails
- **THEN** the run SHALL continue
- **AND** one structured audit failure SHALL be recorded for that attempt
- **AND** the pending logical records SHALL remain available for retry at the next boundary.

### Requirement: ACP audit durability follows diagnostic boundaries

Plugin-owned pending audit streams SHALL flush for their target owner at prompt or turn terminal, adapter close or explicit disconnect, run terminal, diagnostic completion, and controlled shutdown.

#### Scenario: Diagnostic result contains complete plugin audit

- **WHEN** a backend probe or refresh-cache diagnostic returns its result
- **THEN** pending plugin-owned audit records for that diagnostic owner SHALL already be appended
- **AND** the returned diagnostic directory SHALL be complete for those streams.

#### Scenario: Non-debug execution creates no high-volume audit

- **GIVEN** debug mode is disabled
- **WHEN** ACP execution emits transcript, transport, or lifecycle activity
- **THEN** the plugin SHALL NOT create `timeline.ndjson`, `acp-updates.ndjson`, or `transport.ndjson`.

#### Scenario: Bridge audit ownership remains external

- **WHEN** the Rust WebSocket bridge writes `bridge.ndjson`
- **THEN** the plugin buffered audit writer SHALL NOT own, buffer, merge, or rewrite that file.
