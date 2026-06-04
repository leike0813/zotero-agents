## ADDED Requirements

### Requirement: Reference Sidecar Ingestion SHALL Skip Deterministic Invalid Raw References
Synthesis sidecar ingestion SHALL use deterministic invalid-reference filtering
as a fallback for legacy, imported, or direct service inputs that bypass
literature-digest workflow apply.

#### Scenario: Legacy references artifact includes invalid rows
- **WHEN** sidecar ingestion reads references with bare DOI/URL titles, publication-metadata-only titles, author-only titles, empty titles, or no usable content tokens
- **THEN** those rows SHALL NOT create raw reference rows
- **AND** they SHALL NOT create canonical references.

#### Scenario: Warning-only rows are ingested
- **WHEN** sidecar ingestion reads a plausible reference with bibliographic suffix, possible author-prefix noise, missing year/authors, or a short but plausible title
- **THEN** that row SHALL remain eligible for raw/canonical materialization.

#### Scenario: Sidecar ingestion executes
- **WHEN** sidecar ingestion applies the fallback filter
- **THEN** it SHALL NOT call Advanced Reference Matching, clustered dedupe, or review proposal generation.
