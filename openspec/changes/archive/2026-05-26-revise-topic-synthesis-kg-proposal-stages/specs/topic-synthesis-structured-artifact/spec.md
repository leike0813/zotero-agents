## ADDED Requirements

### Requirement: KG proposals remain outside structured topic artifact source of truth

Concept card proposals and topic graph relation proposals SHALL remain sidecars and SHALL NOT become sections or embedded fields in the structured topic synthesis artifact.

#### Scenario: Final structured artifact is assembled

- **WHEN** runtime assembles `result/topic-analysis.json` or `result/topic-analysis.patch.json`
- **THEN** it SHALL NOT include concept cards or topic graph relation proposal bodies
- **AND** host apply SHALL consume those proposals only through final bundle sidecar paths.
