# synthesis-review-input-contract Delta

## ADDED Requirements

### Requirement: Review workflows consume stable Synthesis Layer inputs

Synthesis Layer SHALL expose a stable JSON-safe input DTO for future literature
review workflows.

#### Scenario: Review input is built for a topic synthesis artifact

- **WHEN** a topic synthesis artifact, metadata, resolved paper set, registry
  rows, and citation graph slice are available
- **THEN** the DTO SHALL include topic Markdown, metadata, resolved papers,
  registry readiness, graph slice, missing artifact diagnostics, and timeline
  content.

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
