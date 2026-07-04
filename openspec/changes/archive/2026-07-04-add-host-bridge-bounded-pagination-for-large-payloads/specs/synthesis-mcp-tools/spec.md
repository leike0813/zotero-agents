## ADDED Requirements

### Requirement: Synthesis cache-view tools expose bounded pages

Synthesis cache-view tools SHALL expose library, topic, index, and citation
graph collections through page-sized or strictly bounded responses.

#### Scenario: Topics list is paged
- **WHEN** a caller invokes `topics.list`
- **THEN** the response SHALL include one page of topics and cursor metadata.

#### Scenario: Graph metrics and rankings are paged
- **WHEN** a caller invokes `citation_graph.get_metrics`,
  `citation_graph.rank_external_references`, or
  `citation_graph.rank_library_papers`
- **THEN** the response SHALL include one page of items and cursor metadata.

#### Scenario: Library index attached sections are bounded
- **WHEN** a caller requests library index tags, collections, topics, or
  registry sections
- **THEN** each included section SHALL be page-sized and SHALL expose pagination
  metadata.
