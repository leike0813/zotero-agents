## MODIFIED Requirements

### Requirement: Assistant Workspace UI publish events are governed

Assistant Workspace panels SHALL classify runtime refreshes as `critical`,
`boundary`, `live`, or `background` before publishing UI snapshots.

`critical` and `boundary` events SHALL publish immediately. Text or thought
`live` transcript events SHALL publish naturally when streaming render is
enabled. Metadata `live` events SHALL publish at most once per shared live
cadence when streaming render is enabled. Text or thought `live` events SHALL
NOT publish transcript text when streaming render is disabled unless the panel
classifies a complete semantic message as a boundary. `background` events SHALL
update canonical state without publishing a visible snapshot.

#### Scenario: disabled streaming render is boundary-only

- **GIVEN** streaming render is disabled
- **WHEN** a running Assistant Workspace panel receives live runtime updates
- **THEN** those updates do not publish UI snapshots
- **AND** the next critical or boundary event publishes the latest allowed view.

#### Scenario: panel-specific complete messages can be boundaries

- **GIVEN** streaming render is disabled
- **WHEN** a panel receives a complete semantic message rather than a partial
  text chunk
- **THEN** the panel MAY classify that complete message as a boundary
- **AND** publish the accumulated UI-visible transcript immediately.
