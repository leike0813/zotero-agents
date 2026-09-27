## ADDED Requirements

### Requirement: CLI SHALL expose Saved Search discovery through canonical read contracts
The CLI SHALL expose library saved-searches list with library-id, limit and cursor controls mapped to library.list_saved_searches. Its command descriptor and result schema SHALL declare read-only effects, stable portable refs, display names and bounded continuation. Existing ordinary read leaves SHALL consume the Broker page envelope without client-side repagination or numeric cursor aliases.

#### Scenario: Offline Saved Search command is inspected
- **WHEN** an agent requests command help or surface description
- **THEN** the canonical argv, capability mapping, inputs, page result and read-only effects are available without network access.

#### Scenario: Payload page has unknown total
- **WHEN** a remote payload scan returns total:null and a progressing cursor
- **THEN** CLI schema validation accepts the canonical result without inventing a numeric total.
