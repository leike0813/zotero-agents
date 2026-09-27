## ADDED Requirements

### Requirement: Citation Graph rebuild completion SHALL refresh the visible graph
After an asynchronous rebuild commits a new graph basis or layout, the Workbench SHALL perform a bounded refresh of the active graph surface. A transient busy result MAY be retried within the existing operation lifecycle, but a second user rebuild action SHALL NOT be required.

#### Scenario: The first rebuild completes asynchronously
- **WHEN** the rebuild operation transitions from accepted/running to a committed ready result
- **THEN** the active Workbench graph reloads the new graph basis and layout
- **AND** the user sees the result without clicking rebuild again.

#### Scenario: A graph refresh races a busy application
- **WHEN** the first post-terminal read observes a transient graph-application-busy state
- **THEN** the Workbench performs a finite follow-up refresh using the existing bounded scheduling model
- **AND** it eventually shows either the ready graph or a stable diagnostic.

#### Scenario: A layout-only update is committed
- **WHEN** the graph model identity is unchanged but the layout identity changes
- **THEN** the visible nodes use coordinates from the new layout basis
- **AND** stale or compact initial coordinates are not retained merely because graph rows are unchanged.
