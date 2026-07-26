## ADDED Requirements

### Requirement: ACP transcript range batches SHALL use bounded packed worker transfer

ACP Chat and ACP Skills indexed transcript reads in Zotero SHALL send bounded
range batches to one reusable privileged worker. Each physical batch SHALL open
the source once and return one packed transferable byte buffer plus range
length metadata instead of one main-thread file operation or transferable
object per event.

#### Scenario: Event-heavy page is hydrated
- **WHEN** one selected transcript page requires many indexed event ranges
- **THEN** the ranges SHALL be partitioned by fixed entry and byte budgets
- **AND** each batch SHALL open and close the source once
- **AND** the folded page items SHALL preserve index item and event order.

#### Scenario: Range reaches or exceeds EOF
- **WHEN** a normalized indexed range overlaps or begins beyond the observed file size
- **THEN** the worker SHALL return the available short read or an empty result in the corresponding output position
- **AND** it SHALL NOT read outside the file.

#### Scenario: Worker generation fails
- **WHEN** the worker errors, times out, or is stopped during pending reads
- **THEN** every request owned by that generation SHALL settle with a structured failure
- **AND** a later request MAY lazily create a fresh generation unless controlled shutdown has begun.
