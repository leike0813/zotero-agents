# synthesis-layer-integration Delta

## ADDED Requirements

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
