## ADDED Requirements

### Requirement: Shared transcript renderer preserves multi-page continuity

The shared virtual transcript renderer SHALL retain non-overlapping cached pages when a tail page, historical page, or terminal mutation arrives. It SHALL reconcile rows and virtual gaps by stable keys, preserve a stable row-or-gap anchor across structural and measurement commits, and apply bottom following only for the current owner generation while the user remains explicitly at the tail.

#### Scenario: Tail update preserves older pages

- **GIVEN** a virtual transcript has a tail page and at least two older cached pages
- **WHEN** a new tail page and a terminal item patch are rendered
- **THEN** all non-overlapping older pages SHALL remain available without duplicate rows
- **AND** the terminal row SHALL remain at its stable logical position.

#### Scenario: Page replacement is range-scoped

- **WHEN** an incoming page has the same page identity or overlaps an existing logical index range
- **THEN** the renderer SHALL replace only the same or overlapping range
- **AND** it SHALL preserve every non-overlapping cached page.

#### Scenario: Spacer DOM matches the virtual layout

- **WHEN** page merges or row measurements change unloaded and offscreen gaps
- **THEN** keyed edge, inter-page, and loading spacers SHALL appear in logical order
- **AND** their DOM heights SHALL match the current virtual layout.

#### Scenario: Terminal update does not pull an anchored user to the bottom

- **GIVEN** the user has scrolled away from the tail
- **WHEN** a terminal patch or row-height remeasurement commits
- **THEN** the renderer SHALL restore the stable visible anchor and offset
- **AND** it SHALL NOT scroll to the bottom.

#### Scenario: Stale bottom-stick callback cannot move the viewport

- **GIVEN** bottom-stick animation work is pending
- **WHEN** the owner or document generation changes, or the user scrolls away
- **THEN** the callback SHALL revalidate those conditions before writing `scrollTop`
- **AND** stale work SHALL leave the viewport unchanged.

