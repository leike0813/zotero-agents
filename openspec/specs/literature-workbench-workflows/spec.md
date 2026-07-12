# literature-workbench-workflows Specification

## Purpose

Specification for literature workbench workflow sequences, including digest analysis, tag regulation, and deep reading with per-step apply capabilities.
## Requirements
### Requirement: Literature digest automatic tag branch

`literature-analysis` SHALL support an optional ACP-only automatic tag-regulator branch.

#### Scenario: Automatic tag disabled

- **GIVEN** `auto_tag_regulator` is false
- **WHEN** literature-analysis builds its request
- **THEN** it emits a one-step `skillrunner.sequence.v1` request that runs the literature-analysis skill
- **AND** the digest step declares `apply_result` for `literature-analysis`.

#### Scenario: Automatic tag enabled

- **GIVEN** `auto_tag_regulator` is true
- **WHEN** literature-analysis builds its request
- **THEN** it emits a two-step sequence that runs literature-analysis and then tag-regulator in a reused workflow workspace
- **AND** both steps declare their own `apply_result` workflow.

#### Scenario: Tag branch failure does not prevent digest apply

- **GIVEN** the digest step succeeds and its step apply succeeds
- **WHEN** the tag-regulator step later fails
- **THEN** the digest notes and sidecar remain applied.

### Requirement: Literature deep reading cascaded apply

`literature-deep-reading` SHALL apply translator and deep-reading outputs at their owning sequence steps.

#### Scenario: Normal cascade applies translator before deep reading

- **GIVEN** no reusable translator alignment exists
- **WHEN** literature-deep-reading builds its sequence request
- **THEN** the translate step SHALL declare `apply_result` for literature-translator
- **AND** the deep_reading step SHALL declare `apply_result` for literature-deep-reading.

#### Scenario: Shortcut applies only deep reading

- **GIVEN** a reusable translator alignment exists
- **WHEN** literature-deep-reading builds its sequence request
- **THEN** the request SHALL contain only the deep_reading step
- **AND** that step SHALL declare `apply_result` for literature-deep-reading.

#### Scenario: Deep reading failure does not prevent translator apply

- **GIVEN** the translate step succeeds and its step apply succeeds
- **WHEN** the deep_reading step later fails
- **THEN** the translator Markdown and alignment JSON remain materialized.

### Requirement: Literature search ingest returns concise user-facing output

`literature-search-ingest` SHALL return a concise final JSON object after
ingest completion. The success branch SHALL list successful ingest references,
missing-PDF references, and non-empty ingest failures only.

#### Scenario: Successful ingest output is concise

- **WHEN** `literature-search-ingest` completes at least one successful
  `literature.ingest` call
- **THEN** the final JSON SHALL include `kind: "literature_search_ingest"`
- **AND** it SHALL include `ingested_references`
- **AND** it SHALL include `missing_pdf_references`
- **AND** it SHALL NOT require `confirmed_references`, `summary`, or full
  per-call `results`.

#### Scenario: Partial failures are visible only when present

- **WHEN** one or more requested literature ingest calls fail
- **THEN** the final JSON SHALL include `ingest_failures` with the failed
  references and structured error details.

#### Scenario: Skill requests ingest-time landing URL attachment

- **WHEN** the skill writes a per-paper `literature.ingest` payload
- **THEN** each payload SHALL set `paper.attachLandingUrlOnMissingPdf: true`.

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
- **THEN** the apply hook SHALL consume canonical metadata from `metadata.itemType`, `metadata.fields`, and `metadata.creators`
- **AND** it SHALL only change between regular bibliographic item types
- **AND** it SHALL NOT mutate attachments, notes, annotations, tags, collections, or related items.

### Requirement: Literature metadata search skill SHALL reject container-title substitution

`literature-metadata-search` SHALL preserve the selected record's direct-work title unless evidence proves that a different title describes the same direct bibliographic work.

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

