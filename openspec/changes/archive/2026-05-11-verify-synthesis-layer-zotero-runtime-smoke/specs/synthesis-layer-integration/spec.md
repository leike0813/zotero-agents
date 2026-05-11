# synthesis-layer-integration Delta

## ADDED Requirements

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
