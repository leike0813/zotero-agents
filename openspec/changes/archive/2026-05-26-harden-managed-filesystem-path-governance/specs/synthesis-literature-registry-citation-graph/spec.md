## ADDED Requirements

### Requirement: Literature registry canonical records are persisted safely

Literature registry canonical records SHALL be persisted through Synthesis
canonical transactions using managed path policy.

#### Scenario: Long reference-derived work id exists

- **WHEN** a work, reference instance, reference resolution, citation context,
  or cleanup proposal id is derived from a long raw reference or title
- **THEN** the canonical asset filename SHALL be short and stable
- **AND** registry rebuild SHALL not fail solely because the semantic id is
  longer than a platform filename budget.
