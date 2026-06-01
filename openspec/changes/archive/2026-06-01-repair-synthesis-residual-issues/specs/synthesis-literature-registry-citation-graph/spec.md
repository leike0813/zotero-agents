## MODIFIED Requirements

### Requirement: Registry candidate validation handles durable related-items effects by lifecycle state

Registry candidate validation SHALL block unsafe pending related-items external writes, but SHALL NOT block promotion solely because an already-applied Synthesis-created related-items effect has become stale.

#### Scenario: Pending related-items effect cannot resolve against a candidate

- **GIVEN** a durable related-items sync effect has status `pending_external_write`
- **WHEN** Registry candidate validation cannot resolve its source/target literature items, active Zotero bindings, or matched backing citation edge in the candidate state
- **THEN** candidate promotion is blocked with bounded diagnostics.

#### Scenario: Applied Synthesis-created effect backing edge disappears

- **GIVEN** a durable related-items sync effect has status `applied`
- **AND** it records `createdBySynthesis=true`
- **WHEN** Registry candidate validation finds that its backing matched edge is absent from the candidate
- **THEN** candidate promotion is allowed
- **AND** bounded diagnostics indicate that related-items sync reconciliation is needed.

### Requirement: Full Registry rebuild promotion schedules related-items sync reconciliation

Successful full Registry rebuild promotion SHALL enqueue related-items sync work when the promoted graph contains matched library-to-library edges or stale Synthesis-created related-items effects need revocation.

#### Scenario: Full Registry rebuild promotes matched library-to-library edges

- **WHEN** a full Registry rebuild promotion succeeds
- **AND** the active citation graph contains matched edges between Zotero-bound library items
- **THEN** a `related_items_sync_dirty` event is queued for the related-items worker.

#### Scenario: Full Registry rebuild removes a previously synced edge

- **GIVEN** an applied Synthesis-created related-items effect exists
- **WHEN** full Registry rebuild promotion removes its backing active citation edge
- **THEN** a `related_items_sync_dirty` event is queued
- **AND** the related-items worker may revoke the external Zotero relation using durable source/target item keys.
