## ADDED Requirements

### Requirement: Workbench Index exposes Literature registry filters

The Synthesis Workbench SHALL present Index as a Literature registry view backed by canonical literature registry projections.

#### Scenario: Literature view is filtered

- **WHEN** the user selects All, Library items, Reference-only, Matched, Ambiguous, Unresolved, Needs cleanup, or Stale
- **THEN** the Workbench SHALL filter rows from the literature registry projection
- **AND** it SHALL preserve existing search behavior.

### Requirement: Workbench Graph reads latest usable citation snapshot

The Workbench Graph view SHALL render the latest usable citation graph snapshot and report stale or missing state without blocking the UI for a rebuild.

#### Scenario: Graph snapshot is stale

- **WHEN** the citation graph projection is stale or missing
- **THEN** the Graph view SHALL show projection status and a rebuild command
- **AND** it SHALL NOT synchronously wait for a full rebuild during render.

### Requirement: Cleanup queue actions are bounded

The Workbench SHALL expose cleanup proposal actions limited to approve, reject, and skip.

#### Scenario: User applies cleanup action

- **WHEN** the user triggers approve, reject, or skip for a cleanup proposal
- **THEN** the host command SHALL route to the Synthesis service
- **AND** the refreshed snapshot SHALL show the updated proposal state.
