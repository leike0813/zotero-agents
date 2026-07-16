## MODIFIED Requirements

### Requirement: Publication lifecycle is post-owned

Only an in-window post SHALL create a publication lifecycle record. The record
SHALL retain source, kind, wire form, exact cause, delivery sequence, bounded ACK
outcomes, and a first-write-wins terminal result.

#### Scenario: A rejected render ACK arrives

- **WHEN** an in-window publication receives a render-failed rejection
- **THEN** the ledger records that terminal result
- **AND** a later ACK cannot replace it with accepted or missing-ACK status.

### Requirement: Correctness evidence is independent of metric series caps

Lifecycle records and correctness counters SHALL remain complete after metric
series reach their cap. Any series drop SHALL be reported at profile top level
and mark measurement incomplete.

#### Scenario: More than 128 metric label combinations occur

- **WHEN** the profiler drops additional metric series
- **THEN** publication lifecycle evidence remains queryable
- **AND** the profile reports structured incompleteness.
