# synthesis-layer-integration Specification

## Purpose
TBD - created by archiving change harden-synthesis-layer-v1-integration. Update Purpose after archive.
## Requirements
### Requirement: Topic synthesis results persist through a plugin-side service

The plugin SHALL expose a Synthesis service that validates `topic_synthesis`
result bundles and persists accepted results as canonical assets.

#### Scenario: Base hashes match

- **WHEN** a valid topic synthesis bundle is applied with matching base hashes
- **THEN** the service SHALL write current Markdown and metadata canonical assets
- **AND** it SHALL update topic definition, resolver, resolved paper set, index,
  and log state
- **AND** it SHALL refresh the Zotero mirror from canonical assets.

#### Scenario: Base hashes mismatch

- **WHEN** a valid topic synthesis bundle is applied with stale base hashes
- **THEN** the service SHALL NOT overwrite current topic assets
- **AND** it SHALL save a local conflict candidate
- **AND** it SHALL NOT refresh the Zotero mirror.

### Requirement: Workflow hooks delegate formal persistence to hostApi

The builtin `synthesize-topic` workflow hook SHALL delegate formal persistence
to `runtime.hostApi.synthesis.applyTopicSynthesisResult`.

#### Scenario: Host synthesis service is available

- **WHEN** applyResult receives a result bundle and host synthesis service exists
- **THEN** the hook SHALL call the host service
- **AND** it SHALL return the host service result.

#### Scenario: Host synthesis service is unavailable

- **WHEN** applyResult receives a result bundle without host synthesis service
- **THEN** the hook SHALL fail explicitly instead of pretending the result was
  persisted.

### Requirement: Synthesis reads use persisted service state

MCP, UI, and review workflow input SHALL read topic synthesis data from the same
persisted service state.

#### Scenario: UI snapshot is requested after apply

- **WHEN** a topic synthesis bundle has been persisted
- **THEN** the UI snapshot SHALL include the persisted topic artifact row
- **AND** it SHALL expose storage, mirror, conflict, registry, and graph state
  from the service.

#### Scenario: Review input is requested after apply

- **WHEN** a topic synthesis bundle has been persisted
- **THEN** review input SHALL include the persisted topic Markdown, resolver,
  resolved paper set, registry readiness, and citation graph slice.

### Requirement: Zotero mirror runtime smoke is covered

Synthesis Layer integration SHALL include a smoke test that exercises the Zotero
mirror adapter against Zotero item/note APIs or the project Zotero mock.

#### Scenario: Topic apply creates anchor and note shards

- **WHEN** a valid topic synthesis bundle is applied through a service using the
  Zotero mirror adapter
- **THEN** canonical topic assets SHALL be written
- **AND** a personal-library anchor document SHALL be created or reused
- **AND** child note shards SHALL contain decodable hidden payloads.

#### Scenario: Host API exposes synthesis service

- **WHEN** workflow host API is created
- **THEN** it SHALL expose a Synthesis service for workflow hooks.

#### Scenario: User deletes a mirror shard

- **WHEN** a shard listed in the mirror manifest is removed from Zotero
- **THEN** snapshot sync assessment SHALL report a degraded mirror
- **AND** canonical assets SHALL remain intact.

### Requirement: Topic synthesis artifacts support soft delete and purge

The Synthesis service SHALL support soft deletion of active topic synthesis
artifacts and physical purge of previously deleted topic artifacts.

#### Scenario: User soft deletes a topic artifact

- **WHEN** an active topic artifact is deleted
- **THEN** the service SHALL remove it from the active artifact index
- **AND** it SHALL preserve the deleted artifact in a deleted-artifact store
- **AND** it SHALL mark or remove active topic definition, resolver, and resolved
  paper set state so the topic is not returned by default inventory calls
- **AND** it SHALL refresh the Zotero mirror from the canonical active state.

#### Scenario: User purges deleted topic artifacts

- **WHEN** deleted topic artifacts are purged
- **THEN** the service SHALL physically remove only deleted-artifact store assets
- **AND** it SHALL NOT remove active topic artifacts, registry projections,
  citation graph projections, ACP run workspaces, or the Zotero anchor item
- **AND** it SHALL refresh the Zotero mirror.

#### Scenario: Mirror refresh fails during lifecycle mutation

- **WHEN** delete or purge changes canonical state but mirror refresh fails
- **THEN** the service SHALL keep the canonical mutation
- **AND** it SHALL return a warning instead of silently reporting full success.

### Requirement: Topic synthesis freshness is deterministically tracked

The Synthesis service SHALL persist and update topic synthesis freshness from
plugin-owned deterministic dependency snapshots.

#### Scenario: Fresh baseline is written after apply

- **WHEN** a topic synthesis result is applied successfully
- **THEN** the service SHALL write an artifact-state entry for that topic
- **AND** the entry SHALL contain baseline and current dependency hashes
- **AND** the topic SHALL be reported as `fresh`
- **AND** incomplete evidence SHALL be reported through coverage, not by turning
  the topic stale.

#### Scenario: Legacy topic initializes baseline on first scan

- **GIVEN** an active topic has no artifact-state entry
- **WHEN** freshness is scanned and required canonical state is readable
- **THEN** the service SHALL initialize the baseline from the current dependency
  snapshot
- **AND** it SHALL log `baseline_initialized`
- **AND** it SHALL NOT mark the topic stale only because the baseline was
  missing.

#### Scenario: Topic becomes stale after dependency changes

- **WHEN** the current resolver result, resolved paper artifacts, artifact
  availability, or persisted graph hash differs from the baseline
- **THEN** the service SHALL mark the topic `stale`
- **AND** it SHALL record machine-readable stale reasons.

#### Scenario: Topic becomes dirty after canonical state cannot be trusted

- **WHEN** required topic files, resolver state, resolved paper set state, or
  index hashes are missing or inconsistent
- **THEN** the service SHALL mark the topic `dirty`
- **AND** it SHALL record dirty reasons without rewriting the topic Markdown.

#### Scenario: Mirror includes artifact state

- **WHEN** the Synthesis mirror is refreshed
- **THEN** artifact freshness state SHALL be included in mirror shards
- **AND** mirror failures SHALL NOT change the computed freshness result.

