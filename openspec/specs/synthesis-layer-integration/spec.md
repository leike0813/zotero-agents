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

