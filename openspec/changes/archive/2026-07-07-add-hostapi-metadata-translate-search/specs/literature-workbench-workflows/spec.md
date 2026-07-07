## MODIFIED Requirements

### Requirement: Literature metadata curator SHALL update one parent item through preflight-aware metadata lookup

`literature-metadata-curator` SHALL run on exactly one selected parent item and SHALL update metadata through standard workflow `applyResult`.

#### Scenario: Local identifier lookup short-circuits provider dispatch

- **GIVEN** the selected parent item has a DOI, ISBN, or supported URL-derived identifier
- **AND** Zotero Translate Search returns a trustworthy metadata item for that identifier through the Host API metadata facade
- **WHEN** the workflow preflight runs under the precompiled package hook contract
- **THEN** preflight SHALL return `kind: "short-circuit-apply"`
- **AND** the short-circuit result JSON SHALL use `kind: "literature_metadata_curation"`
- **AND** provider dispatch SHALL NOT be required for that input unit.

#### Scenario: Inconclusive local lookup falls back to SkillRunner

- **GIVEN** the selected parent item has no supported identifier, no translator, no returned item, or a mismatched candidate
- **WHEN** the workflow preflight runs
- **THEN** preflight SHALL return `kind: "continue"`
- **AND** `buildRequest` SHALL create one automatic `skillrunner.job.v1` request for `literature-metadata-search`
- **AND** the request input SHALL include the parent metadata snapshot, selected identifier when present, and preflight diagnostics.

#### Scenario: Apply uses the same result shape for local and fallback results

- **WHEN** `literature-metadata-curator` applies either a preflight result or a SkillRunner result
- **THEN** the apply hook SHALL consume canonical metadata from `metadata.fields` and `metadata.creators`
- **AND** it SHALL NOT mutate item type, attachments, notes, tags, collections, or related items.
