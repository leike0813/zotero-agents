## ADDED Requirements

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

Successful canonical service writes SHALL schedule WebDAV autosync after the
canonical write lock is released only when the current Host description has
`autoSyncEnabled: true`.

#### Scenario: Autosync is disabled

- **WHEN** a canonical write commits and `autoSyncEnabled` is false
- **THEN** the write SHALL succeed
- **AND** no automatic WebDAV run SHALL be scheduled.

#### Scenario: Canonical writes share a maintenance epoch

- **WHEN** several canonical writes commit in one active maintenance epoch
- **AND** active canonical workers drain
- **THEN** WebDAV Sync SHALL wait five seconds and run one coalesced autosync.

#### Scenario: Projection state changes

- **WHEN** only cache, projection, job, progress, log, or runtime state changes
- **THEN** WebDAV autosync SHALL NOT be scheduled.

### Requirement: WebDAV automatic retries are bounded

Each explicit or autosync trigger SHALL schedule at most four automatic retry
attempts for retryable failures at 60 seconds, 5 minutes, 15 minutes, and 30
minutes when the current Host description has `autoRetryEnabled: true`.

#### Scenario: Retryable failures continue

- **WHEN** a triggered run repeatedly returns a retryable failure
- **THEN** WebDAV Sync SHALL schedule no more than four automatic retries
- **AND** SHALL use the ordered delays `60s`, `5m`, `15m`, and `30m`.

#### Scenario: Automatic retry is disabled

- **WHEN** a run fails retryably and `autoRetryEnabled` is false
- **THEN** no automatic retry timer SHALL be armed.

#### Scenario: Plugin starts with persisted retry metadata

- **WHEN** a service starts and stored sync state describes an old retry
- **THEN** the service SHALL NOT recreate the hidden retry timer.

### Requirement: WebDAV timer work respects runtime gates

Pending autosync debounce and retry callbacks SHALL be canceled by pause,
disablement, conflict, terminal failure, a superseding explicit trigger, or
composition invalidation.

#### Scenario: Sync becomes paused or conflict-blocked

- **WHEN** a pending automatic callback exists and WebDAV Sync becomes paused
  or `blocked_conflict`
- **THEN** the callback SHALL be canceled
- **AND** it SHALL perform no remote operation.

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

