## ADDED Requirements

### Requirement: Literature registry maintenance uses dirty scopes

Synthesis Literature Registry SHALL maintain paper and reference canonical
records from scoped dirty events rather than routine full-library rebuilds.

#### Scenario: Paper artifact dirty event is processed

- **WHEN** a dirty event identifies one paper whose artifacts changed
- **THEN** the literature registry worker SHALL update canonical records for
  that paper and affected references
- **AND** unrelated papers SHALL NOT be rebuilt.

#### Scenario: Worker fails retryably

- **WHEN** an incremental registry worker fails with a retryable error
- **THEN** dirty scope state SHALL remain queued or failed_retryable
- **AND** latest usable projection data SHALL remain readable.

### Requirement: Literature registry full rebuild is explicit

Full literature registry rebuild SHALL remain an explicit repair or operator
command.

#### Scenario: Read detects missing projection

- **WHEN** a read path detects missing literature projection state
- **THEN** it SHALL return diagnostics and recommended commands
- **AND** it SHALL NOT start a full registry rebuild.

#### Scenario: Manual rebuild is requested

- **WHEN** a user or host command explicitly requests full registry rebuild
- **THEN** the rebuild SHALL run through observable job state and retry/backoff
  behavior.
