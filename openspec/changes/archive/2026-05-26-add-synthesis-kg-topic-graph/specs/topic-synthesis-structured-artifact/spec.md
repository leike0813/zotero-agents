## ADDED Requirements

### Requirement: Relation proposals remain sidecar artifacts

Topic graph relation proposals SHALL NOT become structured topic artifact sections or Markdown export source content.

#### Scenario: Structured artifact is assembled

- **WHEN** a topic synthesis final bundle includes `topic_graph_relation_proposals_path`
- **THEN** the host SHALL keep relation proposals outside the structured artifact sections
- **AND** structured artifact validation SHALL NOT require a relation proposal section.
