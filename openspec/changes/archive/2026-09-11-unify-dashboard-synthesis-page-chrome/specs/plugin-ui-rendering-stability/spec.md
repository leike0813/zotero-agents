## MODIFIED Requirements

### Requirement: Live UI updates preserve interaction state

Live plugin UI surfaces SHALL separate content updates from chrome/status
updates so background activity does not reset user interaction state.

#### Scenario: Chrome-only update arrives

- **WHEN** a live UI surface receives an update that changes only progress,
  action status, warning, heartbeat, or task chrome
- **THEN** it SHALL update only the affected chrome/status region
- **AND** it SHALL NOT rebuild the active content pane.

#### Scenario: Content update requires a render

- **WHEN** a live UI surface receives data that changes the active content pane
- **THEN** it MAY re-render that pane
- **AND** it SHALL preserve stable transient state such as scroll, focus,
  selection, expanded details, drawer state, and graph camera where applicable.

#### Scenario: Graph or canvas data is unchanged

- **WHEN** graph/canvas content data has not changed
- **THEN** status or progress updates SHALL NOT destroy and recreate the graph
  renderer or reset its camera.

#### Scenario: An update carries unchanged selections

- **WHEN** a page receives an update whose region selections are unchanged
- **THEN** region guards and component memoization SHALL resolve without
  rebuilding any region
- **AND** the page SHALL NOT recompute its panel projection for that update.

## ADDED Requirements

### Requirement: Region comparison SHALL short-circuit unchanged selections

Region equality SHALL resolve reference-identical, null, string and boolean
selections directly, and SHALL produce the same result as comparing their
serialized form. A selection that has not changed SHALL NOT be re-serialized.

#### Scenario: The same snapshot object is reprojected

- **WHEN** a page reprojects a snapshot whose object reference did not change
- **THEN** every region sharing that reference SHALL compare equal by reference
- **AND** no region selection SHALL be serialized for comparison.

#### Scenario: Structured selection content changes

- **WHEN** a selection carries new structured content, including nested values
- **THEN** comparison SHALL report inequality
- **AND** the owning region SHALL re-render.

#### Scenario: Selection is empty

- **WHEN** a selection is `null` or `undefined` on both sides of a comparison
- **THEN** comparison SHALL report equality.

### Requirement: High-frequency page input SHALL be coalesced

Filter typing, scroll position updates and other high-frequency page input SHALL
NOT trigger one full page projection or one DOM write per raw event. Events
inside the coalescing window SHALL collapse into a single update, and the
rendered result SHALL reflect the final input value.

#### Scenario: User types in a trace filter

- **WHEN** the user types several characters into a Sidecar trace filter
- **THEN** the page SHALL NOT reproject the whole panel once per keystroke
- **AND** the final rendered filter SHALL match the typed value.

#### Scenario: User scrolls a windowed list

- **WHEN** the user scrolls a workbench list through many events
- **THEN** scroll handling SHALL be coalesced to one update per frame
- **AND** the rendered window SHALL match the final scroll position.

#### Scenario: Input stops

- **WHEN** typing or scrolling stops
- **THEN** the pending coalesced update SHALL still be applied
- **AND** no timer or animation frame belonging to a disposed region SHALL
  remain scheduled.

### Requirement: Surface disposal SHALL release owned listeners and observers

A disposed page, surface or graph region SHALL remove the listeners, observers,
timers and animation frames it registered, and a later re-initialization of the
same surface SHALL NOT observe duplicate listeners.

#### Scenario: Graph surface is disposed

- **WHEN** a mounted graph surface is destroyed
- **THEN** its own control listeners, including zoom-slider input handling,
  SHALL be removed
- **AND** no further handler SHALL run for that surface.

#### Scenario: Region is disposed while an update is pending

- **WHEN** a region is disposed while a debounced or frame-coalesced update is
  still pending
- **THEN** the pending callback SHALL be cancelled or SHALL become a no-op
- **AND** it SHALL NOT write to the disposed DOM.
