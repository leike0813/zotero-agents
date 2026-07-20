## ADDED Requirements

### Requirement: Graph transfer SHALL reuse canonical staged bytes
The transfer owner SHALL feed already staged canonical input page bytes to `citation_graph_build_transfer.v1` and SHALL stage Rust raw-result artifacts directly as validated output pages without full graph materialization, aggregate base64 copies, or a second transfer owner.

#### Scenario: Normal graph transfer executes
- **WHEN** a sealed 2,000-source/100,000-reference input is admitted
- **THEN** the same canonical page bytes SHALL cross the Rust worker boundary
- **AND** publication SHALL preserve external manifest, page, hash, retry, and idempotency semantics.

### Requirement: Transfer publication SHALL be attempt-atomic
Only the existing transfer owner SHALL acknowledge output after strict validation and atomic staging; partial output from cancellation, timeout, crash, invalid framing, or sink failure SHALL remain invisible.

#### Scenario: Rust child fails after output pages
- **WHEN** an attempt terminates before a valid terminal frame and complete manifest
- **THEN** no output SHALL be readable
- **AND** sealed input SHALL remain available for explicit retry.
