## MODIFIED Requirements

### Requirement: Literature metadata curator SHALL update one parent item through preflight-aware metadata lookup

`literature-metadata-curator` SHALL run on exactly one selected parent item and
SHALL update evidence-backed metadata through standard workflow `applyResult`.

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
- **THEN** the apply hook SHALL consume canonical metadata from `metadata.itemType`, `metadata.fields`, and `metadata.creators`
- **AND** it SHALL only change between regular bibliographic item types
- **AND** it SHALL NOT mutate attachments, notes, annotations, tags, collections, or related items.

### Requirement: Literature metadata search skill SHALL reject container-title substitution

`literature-metadata-search` SHALL preserve the selected record's direct-work
title unless evidence proves that a different title describes the same direct
bibliographic work.

#### Scenario: Identifier-free chapter lookup finds a containing publication

- **GIVEN** the source record has no stable identifier and describes a chapter or contribution
- **WHEN** search finds only the containing book, proceedings volume, journal issue, or other container
- **THEN** the skill SHALL NOT emit that container title as `metadata.fields.title`
- **AND** it SHALL use the applicable container field only when supported by evidence.

#### Scenario: Identifier-free title or type correction has strong same-work evidence

- **GIVEN** the source record has no stable identifier
- **WHEN** the skill emits a changed title or `metadata.itemType`
- **THEN** the candidate SHALL be the same direct bibliographic work
- **AND** normalized title agreement, at least two independent corroborating signals, and authoritative landing-page evidence SHALL support the decision.
