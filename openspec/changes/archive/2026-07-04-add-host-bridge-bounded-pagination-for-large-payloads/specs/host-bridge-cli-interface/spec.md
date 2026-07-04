## ADDED Requirements

### Requirement: CLI exposes one-page reads for large Host Bridge surfaces

The Host Bridge CLI SHALL keep stdout as a single complete JSON object and SHALL
not rely on unbounded payloads for library, topic, index, or graph reads.

#### Scenario: CLI reads a paged graph overview
- **WHEN** a user runs `zotero-bridge synthesis graph overview --input <json>`
- **THEN** the CLI SHALL call `citation_graph.get_overview`
- **AND** the returned JSON SHALL represent one graph overview page with
  section-level pagination metadata.

#### Scenario: CLI documents pagination inputs
- **WHEN** a user inspects help or generated Host Bridge CLI guidance
- **THEN** high-cardinality commands SHALL describe cursor and limit usage
- **AND** guidance SHALL NOT instruct agents to retrieve full graph or index
  collections in one command.
