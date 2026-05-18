# synthesis-review-input-contract Specification

## Purpose
TBD - created by archiving change add-synthesis-review-input-contract. Update Purpose after archive.
## Requirements
### Requirement: Review workflows consume stable Synthesis Layer inputs

Review workflow input SHALL remain compatible with Markdown-consuming workflows
while exposing structured topic synthesis content for future workflows.

#### Scenario: Review input is requested for a structured topic

- **WHEN** a review workflow input is requested for a topic with a structured
  artifact
- **THEN** the response SHALL include the Markdown export for compatibility
- **AND** it SHALL include structured topic content with claims, timeline,
  evidence, coverage, gaps, and external literature analysis.

#### Scenario: Review input is requested for a legacy Markdown topic

- **WHEN** a review workflow input is requested for a topic without a structured
  artifact
- **THEN** the response SHALL fail with or return a bounded `needs_recreate`
  state
- **AND** it SHALL NOT silently use old `current.md` as a v2 review source.

### Requirement: Review input does not redefine topic scope

The review input DTO SHALL preserve the topic definition, resolver, and
resolved paper set snapshots from the synthesis artifact.

#### Scenario: Resolved paper set exists

- **WHEN** the DTO is built
- **THEN** it SHALL use the saved resolved paper set
- **AND** it SHALL NOT re-run the resolver.

### Requirement: Later-phase graphs are excluded

The review input DTO SHALL NOT include method lineage, claim conflict, research
gap, or topic timeline graph assets in v1.

#### Scenario: Extra later-phase graph data is present in source input

- **WHEN** the DTO is built
- **THEN** those graph fields SHALL be excluded from the output.

### Requirement: Missing artifacts are diagnostic

Missing digest, references, or citation analysis artifacts SHALL be exposed as
diagnostics.

#### Scenario: A resolved paper lacks citation analysis

- **WHEN** registry readiness rows show `citation_analysis` is missing
- **THEN** the DTO SHALL include a missing artifact diagnostic for that paper.

### Requirement: Topic Detail Consumes Current Structured Review Sections

The UI SHALL consume the structured sections already returned by
`readTopicDetail` without requiring persistence or DTO contract changes.

#### Scenario: Optional review-oriented section is missing

- **GIVEN** a topic detail DTO omits an optional structured section
- **WHEN** Topic Detail renders the corresponding tab
- **THEN** the tab SHALL show a compact empty state
- **AND** it SHALL NOT render raw JSON as the primary user experience.

### Requirement: Review input exposes review-oriented synthesis structures

The review workflow input SHALL expose structures needed by future literature
review workflows.

#### Scenario: Review input includes synthesis structures

- **WHEN** `synthesis.get_review_input` returns a complete topic synthesis
  artifact
- **THEN** it SHALL include positioning, taxonomy, comparison matrix, debates,
  review outline, and evidence map
- **AND** it SHALL mark the input incomplete when these structures are missing.

