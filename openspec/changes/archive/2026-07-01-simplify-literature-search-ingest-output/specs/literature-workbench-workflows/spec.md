## ADDED Requirements

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
