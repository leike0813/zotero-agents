# synthesis-sync-recovery Specification

## Purpose
TBD - created by archiving change add-synthesis-sync-recovery. Update Purpose after archive.

## Requirements

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

### Requirement: WebDAV recovery remains explicit and non-destructive

WebDAV durable recovery SHALL validate and preview remote state before apply and
SHALL NOT overwrite canonical facts automatically when a conflict or invalid
payload is present.

#### Scenario: Remote recovery payload conflicts

- **WHEN** WebDAV recovery detects an invalid payload or an unsafe local/remote
  canonical conflict
- **THEN** it SHALL keep the local canonical state unchanged
- **AND** require an explicit supported recovery or conflict action.
