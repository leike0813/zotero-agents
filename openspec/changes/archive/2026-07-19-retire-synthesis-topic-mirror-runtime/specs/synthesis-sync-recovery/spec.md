## MODIFIED Requirements

### Requirement: Local indexes are disposable

Local materialized indexes SHALL remain rebuildable when corrupt or missing without consulting Topic mirror state.

#### Scenario: Local index is corrupt

- **WHEN** local index health is `corrupt`
- **THEN** the recovery assessment SHALL include a rebuild-index action
- **AND** it SHALL NOT mark canonical assets as corrupt.

#### Scenario: Local index is missing

- **WHEN** local index health is `missing`
- **THEN** the recovery assessment SHALL include a rebuild-index action
- **AND** it SHALL remain independent of any Zotero anchor or shard item.

### Requirement: Startup checks honor preferences

Startup hash checks SHALL run only when enabled by preferences and SHALL assess canonical root, local index, and local conflict state only.

#### Scenario: Startup hash check is disabled

- **WHEN** `runHashCheckOnStartup` is false
- **THEN** startup assessment SHALL return `check_skipped`
- **AND** it SHALL NOT inspect Zotero Topic mirror data.

#### Scenario: Startup hash check is enabled

- **WHEN** `runHashCheckOnStartup` is true
- **THEN** startup assessment SHALL report canonical root, local index, and local conflict actions
- **AND** its request and result SHALL contain no mirror fields.

### Requirement: Conflict candidates remain local-only

Conflict candidate summaries SHALL remain local-only and SHALL expose only local retry and clear actions.

#### Scenario: Open conflict candidates are assessed

- **WHEN** recovery assessment receives local conflict candidates
- **THEN** it SHALL retain only open candidates in deterministic order
- **AND** it SHALL expose local retry and clear actions
- **AND** it SHALL NOT create a mirror rebuild or shard recovery action.

## REMOVED Requirements

### Requirement: Sync recovery never overwrites canonical assets automatically

**Reason**: This requirement only mediated precedence between canonical assets and the retired Topic mirror.

**Migration**: Canonical transactions remain authoritative and normal runtime has no mirror input that could overwrite them.

### Requirement: Missing canonical root can be recovered from valid shards only with confirmation

**Reason**: Runtime canonical-from-shard recovery is retired with the dormant mirror surface.

**Migration**: Rebind or restore canonical storage through supported storage mechanisms; future legacy imports require a separate one-shot tool.

### Requirement: Degraded mirrors are diagnostic and rebuildable

**Reason**: Normal runtime no longer reads, validates, or rebuilds Topic mirror state.

**Migration**: Remove mirror diagnostics and actions from recovery assessment.

### Requirement: Synthesis sync recovery treats canonical files as source of truth

**Reason**: The Git separation clauses are no longer needed once mirror recovery is absent.

**Migration**: Git/WebDAV Sync continue to use their existing canonical state and transport paths without mirror integration.

### Requirement: Recovery excludes normal note mirror operation

**Reason**: Mirror rebuild and recovery actions are removed rather than merely hidden from normal runtime.

**Migration**: Existing Zotero mirror items remain untouched and unadvertised.
