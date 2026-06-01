## MODIFIED Requirements

### Requirement: Full Registry rebuild promotion schedules related-items sync reconciliation

Successful full Registry rebuild promotion SHALL enqueue related-items sync work
when the promoted graph contains matched library-to-library edges or stale
Synthesis-created related-items effects need revocation.

#### Scenario: Full Registry rebuild promotes matched library-to-library edges

- **WHEN** a full Registry rebuild promotion succeeds
- **AND** the active citation graph contains matched edges between Zotero-bound
  library items
- **THEN** a `related_items_sync_dirty` event is queued for the related-items
  worker
- **AND** the service SHALL schedule bounded maintenance drain unless the queue
  is paused.

#### Scenario: Related-items sync host is unavailable

- **GIVEN** a `related_items_sync_dirty` event is queued
- **WHEN** the related-items sync worker cannot access a Zotero related-items
  host
- **THEN** the event SHALL become `failed_retryable` with diagnostics
- **AND** it SHALL NOT remain indefinitely queued.
