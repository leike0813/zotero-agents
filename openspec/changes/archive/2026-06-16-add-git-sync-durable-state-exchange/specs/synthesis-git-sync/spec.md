## ADDED Requirements

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

Workbench-visible Git Sync state SHALL keep blocked conflicts until an explicit resolution action is chosen.

#### Scenario: Conflict is blocked

- **WHEN** Git Sync enters `blocked_conflict`
- **THEN** the UI SHALL expose `keep_local`, `use_remote`, `save_remote_copy`, `mark_needs_attention`, or `clear_after_manual_edit` where supported
- **AND** it SHALL NOT silently use last-writer-wins.
