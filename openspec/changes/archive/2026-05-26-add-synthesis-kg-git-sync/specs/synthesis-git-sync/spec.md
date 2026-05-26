## ADDED Requirements

### Requirement: Git Sync uses an isolated adapter and worktree

The Synthesis service SHALL expose Git Sync through an injectable adapter and SHALL treat the Git worktree as an exchange area, not the local source of truth.

#### Scenario: No adapter is configured

- **WHEN** Git Sync state is loaded without a configured adapter
- **THEN** the queue state SHALL be `disabled`
- **AND** no Git remote operation SHALL be attempted.

#### Scenario: Worktree is used for exchange

- **WHEN** a sync run starts
- **THEN** canonical assets SHALL be exported to an isolated `sync-worktree/`
- **AND** local canonical imports SHALL occur only after validation and atomic promotion.

### Requirement: Git Sync exports only allowlisted canonical assets

Git Sync SHALL only export canonical domain assets and a generated sync manifest.

#### Scenario: Canonical store is exported

- **WHEN** an export snapshot is built
- **THEN** assets under `tags/`, `topics/`, `concepts/`, `topic-graph/`, and `citation-graph/` SHALL be eligible for export
- **AND** `sync/sync-manifest.json` SHALL be generated from sanitized asset metadata.

#### Scenario: Local-only files exist

- **WHEN** `state/`, runtime logs, workspaces, locks, temp dirs, queue state, conflict state, or remote state exist locally
- **THEN** those files SHALL NOT be exported.

### Requirement: Git Sync validates imports before promotion

Imported worktree content SHALL pass validation before it can replace local canonical assets.

#### Scenario: Import contains an unsafe path

- **WHEN** an import candidate contains path traversal, an absolute path, or a non-allowlisted asset path
- **THEN** the import SHALL be rejected
- **AND** the local canonical store SHALL remain unchanged.

#### Scenario: Import manifest does not match content

- **WHEN** manifest hashes or schema versions are invalid
- **THEN** the import SHALL be rejected
- **AND** diagnostics SHALL identify the relative asset scope and error code.

### Requirement: Git Sync has a single-worker queue and lock

Git Sync SHALL process one sync run at a time and coalesce bursty canonical-store-changed events.

#### Scenario: Multiple canonical changes occur quickly

- **WHEN** several store-change events are emitted within the debounce window
- **THEN** Git Sync SHALL enqueue one sync request
- **AND** one worker SHALL process the request after the current lock is released.

#### Scenario: Sync is paused

- **WHEN** the user pauses Git Sync
- **THEN** automatic queued runs SHALL stop
- **AND** local canonical writes SHALL remain allowed.

### Requirement: Conflict gate blocks unsafe remote import

Git Sync SHALL stop before import when the same canonical asset was changed locally and remotely.

#### Scenario: Both sides change the same file

- **WHEN** the merge result reports a same-file local and remote change
- **THEN** queue state SHALL become `blocked_conflict`
- **AND** a conflict report SHALL be written
- **AND** remote changes SHALL NOT be imported into the local canonical store.

### Requirement: Git Sync diagnostics are sanitized

Git Sync diagnostics, receipts, and UI state SHALL NOT expose credentials or sensitive absolute paths.

#### Scenario: Remote URL contains credentials

- **WHEN** Git Sync state is displayed
- **THEN** the remote URL SHALL be sanitized
- **AND** tokens, Authorization headers, and unredacted absolute paths SHALL NOT appear in diagnostics.
