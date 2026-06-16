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

Git Sync SHALL only export durable Synthesis exchange assets and generated manifests. Rebuildable projection/cache assets SHALL NOT be eligible for Git Sync export.

#### Scenario: Durable bundle store is exported

- **WHEN** an export snapshot is built
- **THEN** durable Synthesis facts SHALL be written under `bundles/`
- **AND** root `manifest.json` SHALL describe bundle files and per-entity hashes
- **AND** `sync/sync-manifest.json` MAY describe the exported file set for the Git adapter.

#### Scenario: Rebuildable projection files exist

- **WHEN** citation graph cache, graph layout, metrics, cache basis, operation rows, runtime logs, workspaces, locks, temp dirs, queue state, conflict state, or remote state exist locally
- **THEN** those files SHALL NOT be exported
- **AND** imported durable state SHALL mark affected projections stale rather than ready.

### Requirement: Git Sync validates imports before promotion

Imported worktree content SHALL pass validation before it can hydrate local durable state.

#### Scenario: Bundle import is valid

- **WHEN** a manifest declares durable bundles
- **THEN** each bundle path, bundle hash, bundle schema, entry hash, entity schema, and duplicate entity guard SHALL be validated before promotion
- **AND** conflict checks SHALL use per-entity hashes from the manifest entry index.

#### Scenario: Legacy per-entity import is valid

- **WHEN** a legacy schema `1.0.0` per-entity durable manifest is imported
- **THEN** Git Sync MAY read it for migration
- **AND** the next export SHALL write bundle schema `2.0.0`.

#### Scenario: Import exceeds configured limits

- **WHEN** a bundle import exceeds bundle count, entry count, total byte, or single bundle byte limits
- **THEN** import SHALL fail with `import_size_limit_exceeded` or `bundle_size_limit_exceeded`
- **AND** diagnostics SHALL include bundle count, entry count, total bytes, largest bundle bytes, and largest bundle path where known.

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

Git Sync SHALL provide a production adapter that is enabled only by explicit prefs configuration. Git Sync SHALL store its enabled flag, remote URL, branch, and auto-retry flag in Zotero preferences. Git Sync SHALL detect the Git executable automatically and SHALL NOT require users to configure a Git command path.

#### Scenario: Git Sync prefs are incomplete

- **WHEN** Git Sync is disabled or remote URL is empty
- **THEN** the production Git Sync adapter SHALL remain disabled
- **AND** no git command SHALL be executed
- **AND** Workbench SHALL offer preferences as the configuration path.

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

#### Scenario: Token is cleared

- **WHEN** the user clears the token
- **THEN** encrypted token, masked token, and token timestamp prefs SHALL be empty.

### Requirement: Git Sync connection test is non-mutating

Git Sync SHALL provide a preferences connection test that does not write the sync worktree.

#### Scenario: User tests configuration

- **WHEN** the user runs the Git Sync connection test
- **THEN** Git Sync SHALL validate prefs, token decryptability, Git executable availability, and remote reachability
- **AND** it SHALL NOT initialize, fetch into, commit, or push the sync worktree.

#### Scenario: Remote branch is missing but remote is reachable

- **WHEN** the connection test runs `git ls-remote --heads <remote> <branch>`
- **AND** Git exits successfully with no matching head in stdout
- **THEN** the result SHALL be successful
- **AND** it SHALL report `remote_branch_state` as `missing_initializable`
- **AND** it SHALL include the info diagnostic `git_sync_remote_branch_missing_initializable`.

#### Scenario: Remote cannot be reached

- **WHEN** the connection test runs `git ls-remote --heads <remote> <branch>`
- **AND** Git exits with a non-zero status
- **THEN** the result SHALL fail with sanitized diagnostics
- **AND** it SHALL NOT report the branch as initializable.

#### Scenario: Git executable is missing

- **WHEN** Git Sync cannot detect Git
- **THEN** the connection test SHALL fail with sanitized diagnostics
- **AND** diagnostics SHALL include bounded executable-resolution details such as checked paths.

### Requirement: Git Sync initializes empty remotes on first sync

Git Sync SHALL treat an empty remote repository or missing configured branch as a normal first-sync state.

#### Scenario: Fetch reports missing remote ref

- **WHEN** Git Sync runs `fetch origin <branch>`
- **AND** Git reports that the remote ref cannot be found
- **THEN** Git Sync SHALL record `git_sync_remote_branch_missing_initializable`
- **AND** it SHALL skip `merge origin/<branch>`
- **AND** it SHALL continue to commit and `push origin HEAD:<branch>`.

#### Scenario: Fetch fails for auth or network reasons

- **WHEN** Git Sync runs `fetch origin <branch>`
- **AND** Git exits non-zero for a reason other than missing remote ref
- **THEN** Git Sync SHALL fail the run
- **AND** it SHALL NOT treat the remote branch as initializable.

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

- **WHEN** a user saves or tests a remote URL containing userinfo, credential query parameters, tokens, passwords, or secret query parameters
- **THEN** Git Sync SHALL reject the configuration
- **AND** it SHALL NOT write the remote URL to the sync worktree Git config
- **AND** diagnostics SHALL be sanitized.

#### Scenario: Token is configured separately

- **WHEN** a token is required
- **THEN** it SHALL be read only from encrypted prefs
- **AND** diagnostics, state, UI snapshots, and receipts SHALL NOT expose the token.

### Requirement: Git Sync exchanges durable Synthesis state assets

Git Sync SHALL treat the Git worktree as the durable Synthesis exchange store and SHALL NOT synchronize the live SQLite database file.

#### Scenario: Export builds durable repo payload

- **WHEN** Git Sync exports Synthesis state
- **THEN** it SHALL write a root `manifest.json`
- **AND** it SHALL write durable assets for topics, concepts, topic graph, references, reviews, discovery, tags, related-items effects, and tombstones where present
- **AND** it SHALL derive those assets from repository/domain services and topic `current/` artifacts.

#### Scenario: Runtime-only state exists

- **WHEN** SQLite, WAL/SHM, operation rows, cache projections, graph layout/metrics, runtime logs, locks, credentials, or temp workspaces exist locally
- **THEN** Git Sync SHALL NOT include those runtime-only objects in the Git payload.

### Requirement: Durable assets use stable envelopes and manifest hashes

Each durable JSON asset SHALL use a stable envelope with `schema_id`, `schema_version`, `entity_kind`, `entity_id`, `base_hash`, `content_hash`, `updated_at`, and `data`.

#### Scenario: Export repeats with the same durable facts

- **WHEN** the same durable facts are exported with the same timestamp
- **THEN** asset paths, asset hashes, and manifest hash SHALL remain stable.

#### Scenario: Manifest declares assets

- **WHEN** an import candidate is validated
- **THEN** every declared asset SHALL match its manifest path, bytes, hash, schema id/version, entity kind, and entity id
- **AND** duplicate entity ids SHALL reject the import.

### Requirement: Durable import is validate-preview-apply

Git Sync import SHALL validate and dry-run the durable payload before writing SQLite or topic current assets.

#### Scenario: Durable import is clean

- **WHEN** manifest, path, hash, schema, duplicate, tombstone, and reference-integrity checks pass without blocking conflicts
- **THEN** import MAY write durable facts through repository/domain services
- **AND** it SHALL mark Index, Citation Graph, layout, metrics, Concept, and Tag projections stale.

#### Scenario: Durable import is invalid

- **WHEN** path safety, manifest hash, asset hash, unknown schema, or duplicate entity validation fails
- **THEN** import SHALL reject the payload
- **AND** SQLite SHALL remain unchanged.

### Requirement: Durable conflict gate blocks unsafe three-way merges

Git Sync SHALL use a local-only sync index to compare base, local, and remote hashes before import.

#### Scenario: Same entity changed on both sides

- **WHEN** `last_synced_hash`, local export hash, and remote asset hash show the same entity changed locally and remotely
- **THEN** Git Sync SHALL enter `blocked_conflict`
- **AND** it SHALL write a conflict report
- **AND** it SHALL NOT write SQLite.

#### Scenario: Independent entities changed

- **WHEN** local and remote changes affect different durable entities
- **THEN** Git Sync MAY apply the remote entities and keep local changes for the next export.

#### Scenario: Destructive ambiguity exists

- **WHEN** update-vs-tombstone, rejected/open review divergence, rejected/open discovery divergence, binding/redirect target divergence, or topic graph edge status divergence is detected
- **THEN** Git Sync SHALL block import until the user chooses an explicit resolution.

### Requirement: Durable sync exposes explicit conflict resolution actions

Workbench-visible Git Sync state SHALL keep blocked conflicts until an explicit resolution action is chosen. Git Sync SHALL expose conflict approval actions as `keep_local`, `use_remote`, `save_remote_copy`, `mark_needs_attention`, and `clear_after_manual_edit`.

#### Scenario: Conflict is blocked

- **WHEN** Git Sync enters `blocked_conflict`
- **THEN** the UI SHALL expose `keep_local`, `use_remote`, `save_remote_copy`, `mark_needs_attention`, or `clear_after_manual_edit` where supported
- **AND** it SHALL NOT silently use last-writer-wins.

#### Scenario: User keeps local

- **WHEN** `keep_local` is approved
- **THEN** Git Sync SHALL close the conflict gate, keep local SQLite and artifacts unchanged, and queue export.

#### Scenario: User saves remote copy

- **WHEN** `save_remote_copy` is approved
- **THEN** Git Sync SHALL copy remote conflict assets into local conflict-review storage
- **AND** it SHALL remain `blocked_conflict`.

#### Scenario: User clears after manual edit

- **WHEN** `clear_after_manual_edit` is approved
- **THEN** Git Sync SHALL rerun validation and durable preview
- **AND** it SHALL clear the blocker only if no conflict remains.

#### Scenario: Unsafe remote apply is requested

- **WHEN** `use_remote` cannot be proven safe for a single entity and matching hash
- **THEN** Git Sync SHALL reject the action with diagnostics
- **AND** it SHALL remain `blocked_conflict`.

### Requirement: Git Sync worktree is isolated from existing repositories

Git Sync SHALL only run Git commands inside a plugin-managed worktree protected by a sentinel file.

#### Scenario: Worktree is inside an existing repository

- **WHEN** the configured worktree path resolves inside a parent Git repository that is not the Git Sync worktree itself
- **THEN** Git Sync SHALL fail before `git init`, `remote remove`, `remote add`, `commit`, or `push`
- **AND** diagnostics SHALL include `git_sync_worktree_unsafe_parent_repo`.

#### Scenario: Existing repository lacks sentinel

- **WHEN** the worktree path itself is already a Git repository but lacks the Git Sync sentinel
- **THEN** Git Sync SHALL fail before rewriting remotes
- **AND** diagnostics SHALL include `git_sync_worktree_sentinel_missing`.

#### Scenario: Existing sentinel does not match config

- **WHEN** the Git Sync sentinel remote, branch, or source marker differs from current configuration
- **THEN** Git Sync SHALL fail before rewriting remotes
- **AND** diagnostics SHALL include `git_sync_worktree_sentinel_mismatch`.

#### Scenario: Managed worktree is valid

- **WHEN** the worktree is outside other Git repositories and the sentinel is absent or matches
- **THEN** Git Sync MAY write or refresh the sentinel, initialize the repo, configure `origin`, and sync.

### Requirement: Direct launcher provides safe runtime root

Development direct launches SHALL avoid falling back to the project repository as the runtime root.

#### Scenario: Direct launch has no runtime root override

- **WHEN** `start:direct` launches Zotero without `ZOTERO_SKILLS_RUNTIME_ROOT`
- **THEN** the launcher SHALL pass a project-external runtime root to the Zotero process.

### Requirement: WebDAV sync uses durable bundle snapshots

Synthesis SHALL provide an experimental WebDAV Sync transport that exchanges durable bundle snapshots and SHALL NOT synchronize the live SQLite database.

#### Scenario: WebDAV remote is empty

- **WHEN** WebDAV Sync cannot find `HEAD.json`
- **THEN** it SHALL treat the remote as initializable
- **AND** a manual sync SHALL upload a durable snapshot and then update `HEAD.json`.

#### Scenario: Remote changes during sync

- **WHEN** the remote HEAD changes between initial read and final update
- **THEN** WebDAV Sync SHALL stop without overwriting remote HEAD
- **AND** it SHALL report `webdav_sync_remote_changed_during_sync`.

#### Scenario: Durable validation fails

- **WHEN** a downloaded snapshot has invalid manifest, bundle, or entity hashes
- **THEN** WebDAV Sync SHALL reject the import
- **AND** it SHALL NOT write SQLite.
