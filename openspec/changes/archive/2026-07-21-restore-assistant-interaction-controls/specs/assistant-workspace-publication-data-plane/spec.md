## MODIFIED Requirements

### Requirement: Publication separates transcript content from interaction chrome

Assistant Workspace publication SHALL publish pending messages as transcript content and publish validated prompt, hint, options, file declarations, capability, and limits as interaction state. Child wire and transcript SHALL never contain local source paths or file bytes.

#### Scenario: Waiting snapshot is republished

- **WHEN** transcript revision changes without visible interaction-state changes
- **THEN** the interaction signature SHALL remain stable
- **AND** the interaction managed region SHALL retain DOM identity
