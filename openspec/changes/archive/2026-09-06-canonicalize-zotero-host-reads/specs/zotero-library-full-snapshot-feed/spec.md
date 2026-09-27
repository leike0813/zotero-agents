## ADDED Requirements

### Requirement: Snapshot capture and delivery SHALL yield native admission
Snapshot capture and delivery SHALL execute bounded native slices and release admission between them, retaining existing 30-minute session TTL, 500 default and 1000 maximum public batch sizes, one-million-item cap, fixed-basis and completion evidence. Source changes during capture SHALL fail without creating usable completion authority. Canceled, timed-out or failed slices SHALL NOT authorize promotion; caller callbacks and completion digest work SHALL occur outside native admission.

#### Scenario: Another caller reads during capture
- **WHEN** a large snapshot is being captured or delivered
- **THEN** another Broker caller can enter between its bounded native slices.

#### Scenario: Capture basis changes
- **WHEN** the source basis changes while capture is incomplete
- **THEN** the snapshot fails and publishes no promotion-capable completion evidence.
