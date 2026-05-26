## ADDED Requirements

### Requirement: Git Sync imports canonical assets through one Foundation transaction

Git Sync SHALL NOT write imported canonical assets directly into the local canonical store outside the Foundation transaction helper.

#### Scenario: Import succeeds

- **WHEN** a validated Git Sync snapshot is imported
- **THEN** the Foundation transaction receipt SHALL include every imported canonical asset
- **AND** the receipt SHALL include `sync/sync-manifest.json`
- **AND** one `canonical-store-changed` event SHALL be emitted for the import.

#### Scenario: Import promotion fails

- **WHEN** promotion of any imported asset fails
- **THEN** previously promoted target assets SHALL be restored from backup where they existed
- **AND** new target assets promoted during the failed transaction SHALL be removed
- **AND** no success receipt SHALL be written.

### Requirement: Git Sync uses persistent sync locks

Git Sync SHALL coordinate runs through a persistent lock file with owner and expiry metadata.

#### Scenario: Active lock exists

- **WHEN** a second sync run starts while a non-expired lock exists
- **THEN** the second run SHALL not execute adapter operations
- **AND** queue state SHALL remain or become `queued`.

#### Scenario: Lock is expired

- **WHEN** a sync run starts and the existing lock has expired
- **THEN** the run MAY take over the lock
- **AND** diagnostics SHALL record stale lock takeover without exposing absolute paths.

### Requirement: Git Sync debounces canonical store change notifications

Git Sync SHALL coalesce repeated canonical-store-changed notifications into one queued sync run.

#### Scenario: Several changes arrive within the debounce window

- **WHEN** `notifyCanonicalStoreChanged` is called multiple times quickly
- **THEN** only one worker sync run SHALL execute after the debounce delay.

### Requirement: Git Sync preserves affected conflict assets

Conflict reports and UI state SHALL include affected canonical asset relative paths.

#### Scenario: Same canonical asset changes locally and remotely

- **WHEN** Git Sync enters `blocked_conflict`
- **THEN** conflict state SHALL include the affected relative asset paths and reasons
- **AND** diagnostics SHALL remain sanitized.
