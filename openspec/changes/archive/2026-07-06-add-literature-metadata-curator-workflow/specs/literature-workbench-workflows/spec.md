## ADDED Requirements

### Requirement: Literature metadata curator SHALL update one parent item through preflight-aware metadata lookup

`literature-metadata-curator` SHALL run on exactly one selected parent item and SHALL update metadata through standard workflow `applyResult`.

#### Scenario: Local identifier lookup short-circuits provider dispatch

- **GIVEN** the selected parent item has a DOI or ISBN
- **AND** Zotero Translate Search returns a trustworthy metadata item for that identifier
- **WHEN** the workflow preflight runs
- **THEN** preflight SHALL return `kind: "short-circuit-apply"`
- **AND** the short-circuit result JSON SHALL use `kind: "literature_metadata_curation"`
- **AND** provider dispatch SHALL NOT be required for that input unit.

#### Scenario: Inconclusive local lookup falls back to SkillRunner

- **GIVEN** the selected parent item has no supported identifier, no translator, no returned item, or a mismatched candidate
- **WHEN** the workflow preflight runs
- **THEN** preflight SHALL return `kind: "continue"`
- **AND** `buildRequest` SHALL create one automatic `skillrunner.job.v1` request for `literature-metadata-search`
- **AND** the request input SHALL include the parent metadata snapshot and preflight diagnostics.

#### Scenario: Apply uses the same result shape for local and fallback results

- **WHEN** `literature-metadata-curator` applies either a preflight result or a SkillRunner result
- **THEN** the apply hook SHALL consume canonical metadata from `metadata.fields` and `metadata.creators`
- **AND** it SHALL NOT mutate item type, attachments, notes, tags, collections, or related items.

### Requirement: Literature metadata search skill SHALL be host-readonly

The `literature-metadata-search` skill SHALL search for bibliographic metadata without using Zotero Host Bridge write capabilities.

#### Scenario: Skill receives parent metadata only

- **WHEN** the fallback request is built
- **THEN** the skill input SHALL contain the selected parent metadata snapshot
- **AND** it SHALL NOT require source attachments.

#### Scenario: Skill output is canonical metadata JSON

- **WHEN** the fallback skill completes successfully
- **THEN** it SHALL output a JSON object with `kind: "literature_metadata_curation"`
- **AND** it SHALL include normalized metadata under `metadata.fields` and optionally `metadata.creators`.

### Requirement: Literature metadata search skill SHALL expose an automation-facing contract

The `literature-metadata-search` skill SHALL provide runner-readable schemas and instructions so it can be executed by workflows or injected agents without plugin-specific assumptions.

#### Scenario: Skill package declares runner and schema assets

- **WHEN** the skill package is inspected
- **THEN** it SHALL include `assets/input.schema.json`
- **AND** it SHALL include `assets/output.schema.json`
- **AND** it SHALL include `assets/runner.json`
- **AND** the runner metadata SHALL reference the input and output schema paths.

#### Scenario: Skill can run from generic source-record input

- **WHEN** an agent receives input matching `assets/input.schema.json`
- **THEN** it SHALL treat `input.parent` as the source bibliographic record
- **AND** it SHALL use optional `identifier` and `diagnostics` only as context
- **AND** it SHALL not require Zotero Host Bridge or workflow-local state.

#### Scenario: Low-confidence metadata is skipped

- **GIVEN** search returns no trustworthy candidate, multiple conflicting candidates, or only weak secondary evidence
- **WHEN** the skill completes
- **THEN** it SHALL output canonical JSON with `status: "skipped"`
- **AND** it SHALL leave `metadata.fields` empty
- **AND** it SHALL explain the reason through structured warnings.

### Requirement: Literature metadata search skill SHALL be injectable into ACP Chat

ACP Chat SHALL materialize the `literature-metadata-search` skill alongside the existing injected built-in skills.

#### Scenario: ACP Chat materializes metadata search skill

- **WHEN** an ACP Chat session prepares injected skills
- **THEN** the injected skill id list SHALL include `literature-metadata-search`
- **AND** the skill SHALL be copied into each resolved ACP Chat skill root when present in the plugin skill registry.
