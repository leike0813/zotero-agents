# synthesis-sync-recovery Delta

## ADDED Requirements

### Requirement: Sync recovery never overwrites canonical assets automatically

The recovery model SHALL treat canonical assets as the source of truth when
they exist.

#### Scenario: Canonical assets exist and mirror is stale

- **WHEN** canonical assets are present
- **AND** the mirror manifest hash does not match canonical state
- **THEN** the recovery plan SHALL prefer rebuilding the mirror from canonical
  assets
- **AND** it SHALL NOT restore from shards automatically.

### Requirement: Missing canonical root can be recovered from valid shards only with confirmation

The recovery model SHALL allow note shards to be used as a disaster recovery
source only when canonical assets are missing.

#### Scenario: Root is missing and shards are valid

- **WHEN** the canonical root is missing
- **AND** valid mirror shards are available
- **THEN** the recovery plan SHALL offer shard recovery
- **AND** it SHALL require explicit user confirmation.

### Requirement: Degraded mirrors are diagnostic and rebuildable

The mirror validator SHALL report degraded mirror state when manifest and shard
summaries disagree.

#### Scenario: Shard payload hash differs from manifest

- **WHEN** a shard summary has a payload hash mismatch
- **THEN** the mirror SHALL be marked degraded
- **AND** diagnostics SHALL include the failing shard.

### Requirement: Local indexes are disposable

Local materialized indexes SHALL be rebuildable when corrupt or missing.

#### Scenario: Local index is corrupt

- **WHEN** local index health is `corrupt`
- **THEN** the recovery plan SHALL include a rebuild-index action
- **AND** it SHALL NOT mark canonical assets as corrupt.

### Requirement: Startup checks honor preferences

Startup hash checks SHALL run only when enabled by preferences.

#### Scenario: Startup hash check is disabled

- **WHEN** `runHashCheckOnStartup` is false
- **THEN** startup assessment SHALL return `check_skipped`.

### Requirement: Conflict candidates remain local-only

Conflict candidate summaries SHALL be listed, cleared, and retried locally.

#### Scenario: Conflict candidates are present

- **WHEN** local conflict candidates exist
- **THEN** the model SHALL sort newest candidates first
- **AND** it SHALL expose clear and retry actions
- **AND** it SHALL NOT include candidates in mirror recovery payloads.
