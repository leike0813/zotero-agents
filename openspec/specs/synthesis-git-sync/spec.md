# synthesis-git-sync Specification

## Purpose
TBD - created by archiving change redesign-synthesis-incremental-update-triggers. Update Purpose after archive.
## Requirements
### Requirement: Git Sync waits for canonical maintenance epochs

Synthesis Git Sync SHALL delay maintenance-driven autosync until active
canonical update workers have drained and a large debounce window has elapsed.

#### Scenario: Canonical worker writes several records

- **WHEN** an incremental Synthesis worker commits multiple canonical record
  batches
- **THEN** Git Sync SHALL mark a canonical mutation epoch dirty
- **AND** it SHALL NOT run autosync until active canonical workers have drained.

#### Scenario: Debounce window elapses

- **WHEN** active canonical workers have drained and the maintenance debounce
  window elapses
- **THEN** Git Sync MAY run one coalesced autosync attempt.

### Requirement: Projection and job state do not trigger Git Sync

Git Sync SHALL only react to canonical domain asset mutations, not rebuildable
projection or job state writes.

#### Scenario: Projection is rebuilt

- **WHEN** registry, citation graph, metrics, layout, freshness, or worker state
  files are updated
- **THEN** Git Sync SHALL NOT be triggered by those writes.

#### Scenario: Manual sync is requested during maintenance

- **WHEN** manual sync is requested while canonical maintenance workers are
  active or pending
- **THEN** Git Sync SHALL expose pending-worker diagnostics
- **AND** it SHALL continue to respect pause, conflict, and lock gates.

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

### Requirement: Git Sync actions surface queue state in Workbench

Workbench Git Sync controls SHALL reflect Git Sync queue and allowed-action state.

#### Scenario: A Git Sync action is in flight

- **WHEN** a Git Sync command such as sync, retry, pause, resume, or conflict
  resolution is in flight
- **THEN** the matching Workbench action SHALL be disabled
- **AND** repeated clicks SHALL NOT start duplicate Git Sync commands.

#### Scenario: Git Sync action is not allowed

- **WHEN** Git Sync state omits an action from its allowed actions
- **THEN** the Workbench SHALL NOT present that action as executable.

### Requirement: Git Sync import validates canonical assets

Git Sync SHALL validate imported canonical assets before promotion into the
local canonical store.

#### Scenario: Import path violates managed policy

- **WHEN** an import snapshot contains an asset path with traversal, an absolute
  path form, reserved name, unsafe segment, or over-budget managed relative path
- **THEN** validation SHALL fail before promotion
- **AND** the local canonical store SHALL remain unchanged.

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

### Requirement: Git Sync can use a prefs-configured Git command adapter

Git Sync SHALL provide a production adapter that is enabled only by explicit prefs configuration.

#### Scenario: Git Sync prefs are incomplete

- **WHEN** Git Sync is not enabled or remote URL is empty
- **THEN** the default Synthesis service SHALL keep Git Sync disabled
- **AND** no git command SHALL be executed.

#### Scenario: Git Sync prefs are complete

- **WHEN** Git Sync is enabled and remote configuration is valid
- **THEN** the default Synthesis service SHALL configure a Git command adapter
- **AND** the adapter SHALL use plugin-safe subprocess APIs, not Node-only child process imports.

### Requirement: Git Sync token prefs are encrypted

Git Sync SHALL NOT persist remote tokens in plaintext prefs.

#### Scenario: Token is stored

- **WHEN** a Git Sync token is saved
- **THEN** prefs SHALL contain an encrypted token envelope and masked metadata
- **AND** prefs SHALL NOT contain the plaintext token.

#### Scenario: Token cannot be decrypted

- **WHEN** encrypted token prefs cannot be decrypted
- **THEN** Git Sync SHALL report a config diagnostic
- **AND** SHALL NOT enable the adapter through plaintext fallback.

### Requirement: Git Sync retries transient failures with backoff

Retryable Git Sync failures SHALL be eligible for automatic retry when auto retry is enabled.

#### Scenario: Retryable sync failure occurs

- **WHEN** a sync run fails with retryable adapter or transport failure
- **THEN** Git Sync state SHALL become `failed_retryable`
- **AND** state SHALL include retry attempt metadata and `next_retry_at`.

#### Scenario: Scheduled retry becomes due

- **WHEN** the retry delay elapses and Git Sync is not paused or conflict-blocked
- **THEN** Git Sync SHALL run one retry attempt automatically.

#### Scenario: User retries manually

- **WHEN** the user invokes manual retry
- **THEN** Git Sync SHALL run immediately
- **AND** scheduled retry metadata SHALL be cleared or reset for the new run.

### Requirement: Git Sync command diagnostics are sanitized

Git command diagnostics SHALL NOT expose credentials or sensitive filesystem details.

#### Scenario: Git command fails

- **WHEN** adapter diagnostics include remote URLs, tokens, Authorization headers, stdout, or stderr
- **THEN** Git Sync SHALL store only sanitized diagnostic text.

### Requirement: Git Sync credentials are not stored in remote URLs

Synthesis Git Sync SHALL reject credential-bearing remote URLs before enabling the Git command adapter.

#### Scenario: Remote URL embeds credentials

- **WHEN** the prefs remote URL contains userinfo or credential query parameters
- **THEN** Git Sync SHALL report a configuration diagnostic
- **AND** it SHALL NOT write the remote URL to the sync worktree Git config.

#### Scenario: Token is configured separately

- **WHEN** a token is required
- **THEN** it SHALL be read only from encrypted prefs
- **AND** diagnostics, state, UI snapshots, and receipts SHALL NOT expose the token.

