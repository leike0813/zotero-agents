## ADDED Requirements

### Requirement: Service-level canonical writes enqueue Git Sync autosync

When a Git Sync adapter is configured, successful Synthesis service canonical writes SHALL notify the Git Sync debounce queue after the service write lock is released.

#### Scenario: Canonical write succeeds through Synthesis service

- **WHEN** a service method commits canonical KG assets
- **THEN** Git Sync SHALL receive a canonical-store-changed notification
- **AND** bursty notifications SHALL be coalesced by the existing debounce worker.

#### Scenario: No Git Sync adapter is configured

- **WHEN** a service method commits canonical KG assets without a Git Sync adapter
- **THEN** Git Sync SHALL remain `disabled`
- **AND** the canonical write SHALL still succeed.

### Requirement: Autosync respects queue gates

Git Sync autosync SHALL respect pause, conflict, and lock gates.

#### Scenario: Git Sync is paused

- **WHEN** a canonical write succeeds through Synthesis service
- **THEN** Git Sync queue state SHALL become `queued`
- **AND** no worker run SHALL execute until sync is resumed.

#### Scenario: Git Sync is conflict-blocked

- **WHEN** a canonical write succeeds while Git Sync is `blocked_conflict`
- **THEN** Git Sync SHALL preserve the conflict gate
- **AND** SHALL NOT import remote changes automatically.

### Requirement: Autosync notification failures are best-effort

Git Sync autosync notification failures SHALL NOT roll back successful canonical writes.

#### Scenario: Notification fails after commit

- **WHEN** a canonical write commits but autosync notification fails
- **THEN** the service method SHALL return the successful canonical write result
- **AND** Git Sync diagnostics SHALL record `git_sync_autosync_notify_failed` with sanitized details.
