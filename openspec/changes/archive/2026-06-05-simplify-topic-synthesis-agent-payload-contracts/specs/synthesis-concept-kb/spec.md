## ADDED Requirements

### Requirement: Concept KB exposes read-only alias matching context

Synthesis Concept KB SHALL expose bounded read-only candidate matching context
for topic synthesis KG enrichment.

#### Scenario: Candidate labels are queried

- **WHEN** runtime queries Concept KB with `concept_candidate_labels[]`
- **THEN** the service SHALL return existing concept candidates, alias matches,
  ambiguous matches, and diagnostics suitable for agent guidance
- **AND** it SHALL NOT mutate canonical concept assets or review queue state.

#### Scenario: Candidate query is ambiguous

- **WHEN** multiple existing concepts match a candidate label or alias
- **THEN** the response SHALL mark the match as ambiguous
- **AND** KG enrichment SHALL require explicit agent-side disambiguation fields
  rather than silently merging concepts.
