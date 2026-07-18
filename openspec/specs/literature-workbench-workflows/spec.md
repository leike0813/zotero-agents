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
- **AND** `skip_identifier_fast_path` is absent or `false`
- **AND** Zotero Translate Search returns a trustworthy metadata item for that identifier through the Host API metadata facade
- **WHEN** the workflow preflight runs under the precompiled package hook contract
- **THEN** preflight SHALL return `kind: "short-circuit-apply"`
- **AND** the short-circuit result JSON SHALL use `kind: "literature_metadata_curation"`
- **AND** provider dispatch SHALL NOT be required for that input unit.

#### Scenario: Explicit skip dispatches the metadata search skill

- **GIVEN** the selected parent item has a supported identifier
- **AND** `skip_identifier_fast_path` is `true`
- **WHEN** the workflow preflight runs
- **THEN** preflight SHALL NOT call the Host API or direct-runtime Zotero Translate Search
- **AND** `buildRequest` SHALL create one automatic `skillrunner.job.v1` request for `literature-metadata-search`
- **AND** the selected identifier SHALL remain in the request input as search context.

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

### Requirement: Literature metadata search skill SHALL preserve authoritative Chinese creator names

For a paper originally published in Chinese, the skill SHALL prefer the complete
Chinese-character creator list from an authoritative original source over
romanized or translated creator names.

#### Scenario: Complete Chinese creator list is verified

- **GIVEN** the paper's original publication language is Chinese
- **AND** an authoritative original source verifies the complete creator list and order
- **WHEN** the skill emits `metadata.creators`
- **THEN** it SHALL use the verified Chinese-character names in source order
- **AND** it SHALL NOT substitute pinyin or translated names.

#### Scenario: Complete Chinese creator list cannot be verified

- **GIVEN** the paper's original publication language is Chinese
- **AND** only romanized names or an incomplete Chinese creator list can be verified
- **WHEN** the skill emits otherwise applicable metadata
- **THEN** it SHALL NOT infer or back-transliterate Chinese characters
- **AND** it SHALL emit an empty `metadata.creators` array so existing creators are preserved
- **AND** it SHALL include a warning with code `native_creator_names_unverified`.

#### Scenario: Chinese authors publish an English-language paper

- **GIVEN** the original publication language is not Chinese
- **WHEN** the skill evaluates creator names
- **THEN** author nationality, name, affiliation, or publication country alone SHALL NOT trigger Chinese-character replacement
- **AND** the skill SHALL preserve the officially published creator form.

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

### Requirement: Literature search ingest SHALL expose search breadth and candidate outcomes
The final result SHALL expose a structured search summary, one outcome ledger, and a run-scoped search-ledger artifact rather than parallel success, missing-PDF, and failure arrays.

#### Scenario: Search result exposes candidate tier and curation need
- **WHEN** the interactive workflow completes
- **THEN** each admitted candidate outcome exposes its discovery tier, source trace, decision, ingest status, item reference when available, and `needsCuration`

### Requirement: Literature metadata curator SHALL protect authoritative original-script metadata
The curator SHALL treat translated and romanized titles and creators as matching evidence and SHALL NOT replace an existing authoritative original-script primary field unless a complete authoritative source in the same script supports the replacement.

#### Scenario: English translation does not replace Chinese title
- **WHEN** an exact identifier lookup returns only an English translated title for an item with an authoritative Chinese title
- **THEN** the curator preserves the Chinese title while allowing supported language-neutral fields to be filled

#### Scenario: Romanized creators do not replace native creators
- **WHEN** an identifier lookup returns an incomplete or romanized creator list for an item with authoritative native-script creators
- **THEN** the curator preserves the existing creators and emits a structured warning

### Requirement: Literature metadata curator SHALL preserve semantic field roles
The curator SHALL distinguish direct-work title, alternate title, journal title, book title, proceedings title, conference name, university, and institution before applying Zotero fields for the resolved item type.

#### Scenario: Container title cannot become work title
- **WHEN** a metadata source exposes only a journal, proceedings, or book container title
- **THEN** the curator does not write that value into the direct-work `title` field

### Requirement: Literature metadata curator SHALL close the curation-tag lifecycle
The curator SHALL remove `status:need-metadata-curation` after metadata is successfully applied or authoritatively verified as requiring no changes, and SHALL retain it for unresolved, conflicted, skipped, or failed results.

#### Scenario: Successful curation removes tag
- **WHEN** curation finishes as `applied` or `verified_no_change`
- **THEN** the workflow removes the status tag from the parent item

#### Scenario: Cleanup failure is partial
- **WHEN** metadata succeeds but tag removal fails
- **THEN** the workflow reports a cleanup warning without rolling back metadata and the tag remains available for retry

### Requirement: Workflow status transitions SHALL follow artifact ownership
Each participating builtin workflow MUST only remove the status that represents its own completed artifact, except MinerU which also establishes that PDF/fulltext input was available.

#### Scenario: Curator completes without a metadata change
- **WHEN** Curator verifies the existing metadata and performs no field mutation
- **THEN** it SHALL remove `need-metadata-curation`

#### Scenario: Manual PDF attachment occurs outside MinerU
- **WHEN** a user manually attaches a PDF
- **THEN** the plugin SHALL NOT automatically remove `need-fulltext`

#### Scenario: Translation or Explainer completes
- **WHEN** Translation or Literature Explainer applies a result
- **THEN** no builtin workflow status transition SHALL occur
