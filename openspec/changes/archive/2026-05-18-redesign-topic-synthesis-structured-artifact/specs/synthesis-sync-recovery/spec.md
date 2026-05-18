# synthesis-sync-recovery Delta

## MODIFIED Requirements

### Requirement: Degraded mirrors are diagnostic and rebuildable

The mirror validator SHALL report degraded mirror state when manifest and shard
summaries disagree, and the Workbench/host SHALL allow explicit rebuild from
canonical assets when canonical assets are healthy.

#### Scenario: Existing mirror is missing or degraded while canonical exists

- **WHEN** canonical synthesis assets exist and pass basic health checks
- **AND** the Zotero mirror is missing, empty, or degraded
- **THEN** sync assessment SHALL expose `rebuild_mirror_from_canonical`
- **AND** executing the planned rebuild action SHALL recreate data shards and
  the manifest shard from canonical current assets
- **AND** it SHALL NOT require restoring from shards.

#### Scenario: Note shard creation avoids invalid note title mutation

- **WHEN** the Zotero mirror adapter creates or updates a note shard
- **THEN** it SHALL store shard identity in the hidden shard envelope
- **AND** it SHALL NOT require setting a Zotero note `title` field.

### Requirement: Missing canonical root can be recovered from valid shards only with confirmation

The recovery model SHALL allow note shards to be used as a disaster recovery
source only when canonical assets are missing and the user explicitly confirms.

#### Scenario: Root is missing and manifest shard plus data shards are valid

- **WHEN** the canonical synthesis root is missing
- **AND** a Zotero anchor contains a valid manifest shard and all referenced
  data shards
- **THEN** sync assessment SHALL expose `recover_from_shards`
- **AND** recovery SHALL require explicit confirmation
- **AND** confirmed recovery SHALL write only current state assets and active
  topic current assets described by shard `asset_path`.

#### Scenario: Recovery validates shard asset paths

- **WHEN** recovery reads manifest and data shard `asset_path` values
- **THEN** each path SHALL be normalized and restricted to known synthesis-root
  relative paths
- **AND** recovery SHALL reject absolute paths, parent-directory traversal,
  drive prefixes, UNC paths, backslash traversal, empty path segments,
  duplicate `asset_id` entries, and unknown current-asset paths.
- **AND** recoverable state assets SHALL be restricted to exactly
  `state/index.json`, `state/topic-definitions.json`, `state/resolvers.json`,
  `state/resolved-paper-sets.json`, `state/artifact-state.json`, and
  `state/deleted-topic-artifacts.json`
- **AND** graph/layout/history/run-workspace paths SHALL be outside the recovery
  allowlist.

#### Scenario: Recovery validates asset identity against paths

- **WHEN** a manifest entry declares `asset_id`, `asset_path`, and
  `content_type`
- **THEN** recovery SHALL verify that the logical asset id maps to the expected
  path shape
- **AND** it SHALL verify that `content_type` matches the asset kind and path
  extension
- **AND** it SHALL reject mismatched asset identity, path, or content type.

#### Scenario: Recovery validates shard integrity

- **WHEN** recovery reads manifest and data shards
- **THEN** every referenced shard SHALL pass payload hash, encoded hash,
  seq/total, and content type checks
- **AND** missing shards, duplicate shards, hash mismatches, and sequence
  mismatches SHALL make the recovery plan invalid or degraded.

#### Scenario: Multiple manifests are present

- **WHEN** multiple manifest shards exist under the Zotero anchor
- **THEN** recovery MAY choose only the newest complete manifest that validates
  with all referenced shards
- **AND** multiple valid manifests with different content SHALL be reported as
  ambiguous/degraded rather than recovered automatically.

#### Scenario: Confirmed recovery uses a temporary directory

- **WHEN** shard recovery is confirmed for a missing canonical root
- **THEN** recovery SHALL write decoded assets into a temporary restore
  directory first
- **AND** it SHALL promote the restored root only after all path, hash,
  manifest, and canonical health checks pass
- **AND** a failed promote SHALL NOT leave a half-restored current state.

#### Scenario: Canonical root exists while shards also exist

- **WHEN** canonical synthesis assets already exist
- **AND** Zotero shards also exist
- **THEN** shard recovery SHALL NOT overwrite canonical assets
- **AND** the recovery plan SHALL prefer rebuilding the mirror from canonical
  assets when the mirror is stale or degraded.

#### Scenario: Recovered state lacks citation graph snapshots

- **WHEN** canonical current assets are recovered from Zotero shards
- **AND** citation graph or layout snapshots are absent
- **THEN** the recovered root SHALL NOT be treated as corrupt solely because
  graph/layout snapshots are missing
- **AND** graph/layout SHOULD be regenerated through the existing local rebuild
  or query path.

### Requirement: Conflict candidates remain local-only

Conflict candidate summaries SHALL be listed, cleared, and retried locally, and
SHALL NOT be mirrored to Zotero note shards.

#### Scenario: Conflict candidate exists during mirror refresh

- **WHEN** conflict candidates exist under local synthesis storage
- **AND** the Zotero mirror is refreshed
- **THEN** conflict candidate files SHALL be excluded from mirror shards
- **AND** recovery from shards SHALL NOT recreate conflict candidates.
