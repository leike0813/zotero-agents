## MODIFIED Requirements

### Requirement: Assistant Workspace UI publish events are governed

Assistant Workspace panels SHALL classify runtime refreshes as `critical`, `boundary`, `live`, or `background` and SHALL apply the global `live`, `boundary`, or `silent` execution display mode before publishing.

Critical events SHALL publish immediately and background events SHALL not publish. In `live`, text/thought live events SHALL publish naturally and metadata live events SHALL use the shared cadence. In `boundary`, live text SHALL remain unpublished until a complete semantic message or other existing boundary. In `silent`, ordinary live and boundary events SHALL not publish transcript content; only a semantic-message count change or critical interaction/terminal state SHALL publish.

#### Scenario: live text advances naturally

- **GIVEN** execution display mode is `live`
- **WHEN** a panel receives text or thought chunks
- **THEN** the UI-visible transcript advances without waiting for metadata cadence.

#### Scenario: boundary mode preserves message publication

- **GIVEN** execution display mode is `boundary`
- **WHEN** partial text is followed by a complete semantic message boundary
- **THEN** partial text remains hidden until the boundary
- **AND** the completed message publishes immediately.

#### Scenario: silent chunks publish only first-segment progress

- **GIVEN** execution display mode is `silent`
- **WHEN** many chunks form one assistant semantic message
- **THEN** only the first chunk changes the visible message count
- **AND** later chunks publish no snapshot.

#### Scenario: silent critical state remains immediate

- **GIVEN** execution display mode is `silent`
- **WHEN** a run requires permission, authentication, or user input, or becomes terminal
- **THEN** that critical state publishes immediately.

### Requirement: UI-visible transcript is separate from canonical transcript

Assistant Workspace panels SHALL publish transcript snapshots from a mode-specific UI-visible projection instead of exposing canonical runtime state directly. Metadata updates SHALL NOT expose unpublished text.

In `live` and `boundary`, existing structural transcript behavior SHALL remain. In `silent`, thought, tool, plan, workspace activity, ordinary status, invalid/pending output revision, and non-final assistant content SHALL be absent from the UI-visible transcript. User content, critical interaction state, and final assistant/terminal content SHALL remain eligible.

#### Scenario: metadata does not leak boundary text

- **GIVEN** mode is `boundary` and partial text is unpublished
- **WHEN** metadata publishes
- **THEN** the partial text remains hidden until its message boundary.

#### Scenario: silent structural activity remains hidden

- **GIVEN** mode is `silent`
- **WHEN** tool, plan, workspace, or pending-revision state changes
- **THEN** those changes do not become visible transcript rows.

#### Scenario: final output replaces silent progress

- **GIVEN** silent progress is visible for an owner
- **WHEN** the owner publishes a final assistant result
- **THEN** progress is removed and the final result becomes visible.

## ADDED Requirements

### Requirement: Silent progress preserves managed-region identity

Silent progress SHALL be rendered only by the transcript region. Its owner, count, and revision SHALL NOT enter the render signature of toolbar, banner, plan, hint, reply, context drawer, details drawer, or permission drawer.

#### Scenario: count-only update preserves chrome

- **WHEN** a selected owner's silent message count advances
- **THEN** only its transcript progress node changes
- **AND** all non-transcript managed region nodes retain identity and interactive state.

