## ADDED Requirements

### Requirement: Workspace baseline initialization SHALL be owner- and generation-scoped

The shared publication runtime SHALL identify a baseline by source, selected
owner, and child document generation. Equivalent automatic and explicit calls
SHALL share one result. Changed owner or generation SHALL supersede the prior
attempt, and superseded async work SHALL NOT publish navigation, loading,
transcript, or managed-region data.

#### Scenario: Equivalent initialization paths overlap
- **WHEN** a store refresh starts initialization and activation requests the same owner and document generation
- **THEN** one owner-first and page-first baseline is materialized

#### Scenario: Owner changes during a slow read
- **WHEN** owner A is blocked and owner B becomes selected
- **THEN** owner B publishes loading-first
- **AND** owner A publishes no later region
