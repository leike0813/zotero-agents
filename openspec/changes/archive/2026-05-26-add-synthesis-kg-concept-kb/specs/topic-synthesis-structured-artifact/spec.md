## ADDED Requirements

### Requirement: Concept card proposals remain sidecar artifacts

Concept card proposals SHALL NOT become structured topic artifact sections or Markdown export source content.

#### Scenario: Structured artifact is assembled

- **WHEN** a topic synthesis final bundle includes `concept_cards_proposal_path`
- **THEN** the host SHALL keep concept card proposals outside structured artifact sections
- **AND** structured artifact validation SHALL NOT require a concept card section.
