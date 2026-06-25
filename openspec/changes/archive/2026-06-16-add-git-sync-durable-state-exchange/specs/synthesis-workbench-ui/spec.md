## ADDED Requirements

### Requirement: Workbench surfaces durable Git Sync status

Synthesis Workbench SHALL expose Git Sync state using stable user-visible states: `idle`, `syncing`, `blocked_conflict`, `failed_retryable`, and `failed_permanent`.

#### Scenario: Durable conflict blocks sync

- **WHEN** Git Sync reports `blocked_conflict`
- **THEN** Workbench SHALL keep normal read-only browsing available
- **AND** it SHALL show the conflict entity kind/id, local/remote summary when available, and recommended resolution actions.

#### Scenario: User resolves durable conflict

- **WHEN** the user chooses `keep_local`, `use_remote`, `save_remote_copy`, `mark_needs_attention`, or `clear_after_manual_edit`
- **THEN** Workbench SHALL route the action through Git Sync conflict resolution
- **AND** it SHALL NOT directly mutate SQLite outside the durable import/export service.
