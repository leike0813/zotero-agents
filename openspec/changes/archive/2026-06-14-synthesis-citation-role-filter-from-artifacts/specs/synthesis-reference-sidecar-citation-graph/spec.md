## ADDED Requirements

### Requirement: Citation roles are best-effort sidecar cache data

Synthesis SHALL derive citation graph roles from literature-analysis
`citation_analysis` artifacts only as a best-effort sidecar cache signal.

#### Scenario: Citation analysis function maps to raw reference role

- **GIVEN** a reference sidecar source has a `references` artifact
- **AND** its `citation_analysis` artifact contains `items[].function` values
  allowed by the literature-analysis runtime
- **WHEN** the source is applied or refreshed
- **THEN** the matching raw reference rows SHALL persist normalized role data
- **AND** citation graph edge rows built from those raw references SHALL expose
  those roles through `rolesJson`.

#### Scenario: Citation role cannot be trusted

- **GIVEN** citation analysis is missing, malformed, cannot be aligned to a raw
  reference, or contains a function outside the literature-analysis allowed set
- **WHEN** raw references are persisted
- **THEN** the raw reference role SHALL be normalized to `unknown`.

#### Scenario: Literature-analysis fallback is normalized for Synthesis

- **GIVEN** the literature-analysis runtime emits `uncategorized`
- **WHEN** Synthesis consumes the citation role
- **THEN** Synthesis SHALL store and display the role as `unknown`.
