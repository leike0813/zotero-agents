# synthesis-webdav-durable-sync Specification

## Purpose
Define WebDAV as the sole Synthesis durable-sync transport, including bundle publication, autosync, bounded retry, lifecycle cancellation, import boundaries, and fixed startup cleanup.

## Requirements

### Requirement: WebDAV is the only durable-sync transport

Synthesis SHALL exchange durable state only through the configured WebDAV Host
port and SHALL expose no Git transport, commands, state, credentials, or
configuration surface.

#### Scenario: Sync client is constructed

- **WHEN** a Synthesis client is created
- **THEN** `sync` SHALL contain only the `webDav` command group
- **AND** service and Workbench projections SHALL contain no Git Sync state.

### Requirement: WebDAV sync uses durable bundle snapshots

WebDAV Sync SHALL upload immutable durable bundle snapshots and publish HEAD
only after every declared snapshot asset is stored successfully.

#### Scenario: Durable snapshot is published

- **WHEN** a WebDAV export succeeds
- **THEN** the remote snapshot SHALL contain `manifest.json` and `bundles/**`
- **AND** `HEAD.json` SHALL be written last with the snapshot identity and
  manifest hash.

#### Scenario: Existing durable manifest is imported

- **WHEN** a manifest passes schema, path, size, identity, and hash validation
- **THEN** import SHALL NOT reject it solely because its capability string
  predates `webdav-sync.v1`.

### Requirement: New durable manifests identify WebDAV capability

New durable bundle exports SHALL declare capability `webdav-sync.v1` without
changing the durable bundle schema or entity hash rules.

#### Scenario: Export builds a manifest

- **WHEN** Synthesis renders a new durable bundle manifest
- **THEN** its capability SHALL be `webdav-sync.v1`
- **AND** existing schema and content hash validation SHALL remain unchanged.

### Requirement: Canonical writes schedule WebDAV autosync

Successful eligible canonical writes SHALL publish one post-commit event to a composition-owned Rust coordinator after the application write boundary has returned. The eligible set SHALL cover the surviving fixed-baseline Topic, Tag, Concept, and Topic Graph mutation routes plus promoted Reference refresh. Retired checkpoint/JSON routes SHALL remain retired.

#### Scenario: Eligible canonical write commits
- **WHEN** an eligible route returns its committed result and an actual repository write was observed
- **THEN** the caller receives the committed result without waiting for WebDAV
- **AND** the coordinator starts or resets one five-second debounce

#### Scenario: Write does not commit
- **WHEN** validation fails, the route errors, or the result is unchanged, missing, conflicting, rejected, or otherwise non-committing
- **THEN** no autosync opportunity is published
- **AND** projection, cache, job, progress, log, staged-only, and WebDAV-import writes remain outside the trigger boundary

#### Scenario: Autosync is disabled
- **WHEN** an eligible canonical write commits and the current Host description disables autosync
- **THEN** the write succeeds without a remote WebDAV read or write

#### Scenario: Autosync fails after commit
- **WHEN** WebDAV work fails after an eligible canonical commit
- **THEN** no successful remote publication is reported
- **AND** the committed canonical write remains readable in the current process and after reopen

#### Scenario: Canonical writes share a maintenance epoch
- **WHEN** several eligible writes commit before the five-second deadline or within one active Reference maintenance epoch
- **THEN** they produce at most one WebDAV run
- **AND** the deadline is measured from the final eligible commit after active canonical maintenance workers drain

#### Scenario: Projection state changes
- **WHEN** only projection, cache, job, progress, log, staged suggestion, or WebDAV-import state changes
- **THEN** WebDAV autosync is not scheduled

### Requirement: WebDAV automatic retries are bounded

Each explicit or autosync trigger SHALL schedule at most four automatic retry
attempts for retryable failures at 60 seconds, 5 minutes, 15 minutes, and 30
minutes when the current Host description has `autoRetryEnabled: true`. Each
wait SHALL remain interruptible by its generation owner.

#### Scenario: Retryable failures continue

- **WHEN** a triggered run repeatedly returns a retryable failure
- **THEN** WebDAV Sync SHALL schedule no more than four automatic retries
- **AND** SHALL use the ordered delays `60s`, `5m`, `15m`, and `30m` without truncation.

#### Scenario: Retry wait is canceled

- **WHEN** pause, a superseding trigger, abort, or shutdown cancels the active retry generation
- **THEN** the wait SHALL wake promptly and return without another Host operation.

#### Scenario: Automatic retry is disabled

- **WHEN** a run fails retryably and `autoRetryEnabled` is false
- **THEN** no automatic retry timer SHALL be armed.

#### Scenario: Plugin starts with persisted retry metadata

- **WHEN** a service starts and stored sync state describes an old retry
- **THEN** the service SHALL NOT recreate the hidden retry timer.

### Requirement: WebDAV timer work respects runtime gates

WebDAV durable state transitions SHALL serialize each complete
load-normalize-patch-save operation. Pending autosync debounce and retry
callbacks SHALL be canceled by pause,
disablement, conflict, terminal failure, a superseding explicit trigger, or
composition invalidation. A sync terminal racing a control mutation SHALL
preserve the latest control state.

#### Scenario: Sync becomes paused or conflict-blocked

- **WHEN** a pending automatic callback exists and WebDAV Sync becomes paused
  or `blocked_conflict`
- **THEN** the callback SHALL be canceled
- **AND** it SHALL perform no remote operation.

#### Scenario: Pause races with active sync completion

- **WHEN** pause persists while an admitted sync is in Host or durable work
- **THEN** the final durable state SHALL remain paused
- **AND** the completed run SHALL NOT arm a later automatic retry.

#### Scenario: Composition is invalidated

- **WHEN** the production Synthesis composition is invalidated
- **THEN** its runtime abort signal SHALL cancel every pending debounce and
  retry callback before a replacement service is used.

### Requirement: Durable import uses Foundation transaction boundaries

Validated WebDAV durable imports SHALL hydrate canonical facts only through the
Foundation transaction/repository boundary and SHALL keep rebuildable
projections out of the imported payload.

#### Scenario: Import succeeds

- **WHEN** a WebDAV durable payload validates and preview reports no conflict
- **THEN** its canonical facts SHALL be applied atomically through domain
  repositories
- **AND** affected rebuildable projections SHALL be marked stale.

#### Scenario: Import conflicts

- **WHEN** local and remote hashes show an unsafe same-entity change
- **THEN** WebDAV Sync SHALL remain `blocked_conflict`
- **AND** SHALL NOT mutate local durable facts without explicit resolution.

### Requirement: Retired Git runtime cleanup is fixed and idempotent

Startup cleanup SHALL delete only the two former plugin-managed Git runtime
directories and the nine named Git Sync preferences, and repeated cleanup SHALL
be safe.

#### Scenario: Cleanup runs

- **WHEN** the plugin starts with former Git Sync state present
- **THEN** cleanup SHALL target only `<runtimeRoot>/synthesis/git-sync`,
  `<runtimeRoot>/synthesis/git-sync-worktree`, and the fixed nine
  `synthesisGitSync*` preference keys
- **AND** it SHALL NOT parse remote URLs, run Git commands, contact a remote, or
  inspect/delete an arbitrary external path.

#### Scenario: Cleanup runs again

- **WHEN** the fixed directories or preferences are already absent
- **THEN** cleanup SHALL complete successfully without recreating them.

### Requirement: WebDAV automatic work has explicit lifecycle ownership

The production composition SHALL own one autosync worker. Pending debounce work SHALL be canceled by pause, a superseding explicit WebDAV trigger, conflict control, composition invalidation, or process shutdown. Shutdown SHALL stop autosync admission and reclaim the worker before repository and canonical-store owners are released.

#### Scenario: Sidecar stops with pending autosync
- **WHEN** shutdown begins before the debounce expires
- **THEN** the pending callback performs no reverse-Host read or write
- **AND** shutdown does not leave an autosync-owned application reference alive
