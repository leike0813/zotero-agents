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

