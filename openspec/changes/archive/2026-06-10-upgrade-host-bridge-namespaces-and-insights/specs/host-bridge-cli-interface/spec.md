## MODIFIED Requirements

### Requirement: Rust CLI exposes semantic command groups
The CLI SHALL provide semantic commands for common Zotero host operations rather
than forcing agents to use generic capability calls.

#### Scenario: Agent uses domain Host Bridge command families
- **WHEN** a user or agent needs topic, graph, artifact, resolver, reference,
  schema, concept, index, or aggregate insight data
- **THEN** the CLI SHALL expose domain command families such as `topics`,
  `citation-graph`, `paper-artifacts`, `resolvers`, `reference-index`,
  `schemas`, `concepts`, `library-index`, and `insights`
- **AND** the CLI SHALL NOT expose the old public `synthesis` semantic command
  family.

#### Scenario: Agent ranks graph-derived insights
- **WHEN** a user or agent runs `citation-graph rank-external-references`,
  `citation-graph rank-library-papers`, or `insights attention-queue`
- **THEN** the CLI SHALL call the corresponding read-only Host Bridge insight
  capability
- **AND** the command SHALL NOT trigger graph rebuild, artifact generation, or
  Zotero mutations.
