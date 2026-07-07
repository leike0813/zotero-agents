## MODIFIED Requirements

### Requirement: Shared transcript renderer owns paginated virtualization

The shared Assistant transcript renderer SHALL own paginated transcript
virtualization, page cache state, spacer rows, scroll anchoring, page request
dedupe, and stickiness behavior for panels that opt into virtualized rendering.

For virtualized transcript rows, the renderer SHALL use measured row heights
when available, SHALL use estimated row heights only for rows that have not
been measured, and SHALL compute virtual windows, spacer heights, and page
boundary checks from cumulative row heights rather than fixed item counts.

#### Scenario: Virtualized transcript renders a selected page

- **GIVEN** a panel passes a transcript page and `virtualized: true` to the
  shared transcript renderer
- **WHEN** the renderer renders the transcript
- **THEN** it SHALL render the page's transcript items through the normal shared
  transcript row rendering path
- **AND** the panel SHALL NOT need to transform the page into a full
  `transcriptItems` payload.

#### Scenario: User scroll away is respected

- **GIVEN** a virtualized transcript is sticky at the bottom
- **WHEN** the user scrolls upward away from the bottom
- **AND** a later transcript render occurs
- **THEN** the renderer SHALL preserve the user's scroll position instead of
  forcing the transcript back to the bottom.

#### Scenario: Variable-height row preserves scroll anchor

- **GIVEN** a virtualized transcript contains a row whose measured height is
  larger than the viewport
- **WHEN** the user scrolls through that row and the virtual window rerenders
- **THEN** the renderer SHALL preserve the visible row by stable anchor and row
  offset
- **AND** spacer recalculation SHALL NOT pull the transcript back to the bottom
  or create an empty scroll wall above the row.

#### Scenario: Unloaded spacer scroll is preserved

- **GIVEN** a virtualized transcript has a cached page with an unloaded previous
  or next page represented by a spacer
- **WHEN** the user scrolls into that unloaded spacer while the page request is
  loading
- **THEN** the renderer SHALL preserve the user's scroll position inside the
  spacer
- **AND** it SHALL NOT clamp the transcript back to the first or last cached
  row boundary
- **AND** it SHALL continue to deduplicate page requests for the unloaded page.

#### Scenario: Measured heights drive spacer calculation

- **GIVEN** virtualized transcript rows have measured heights
- **WHEN** the renderer computes the virtual top and bottom spacers
- **THEN** it SHALL size those spacers from the cumulative measured heights of
  offscreen rows
- **AND** it SHALL use the configured estimated row height only for rows without
  a measurement.

#### Scenario: Page requests are deduplicated

- **GIVEN** a virtualized transcript has a cached page and a loading page cursor
- **WHEN** scrolling nears a page boundary
- **THEN** the renderer SHALL request only uncached and non-loading cursors
- **AND** repeated scroll events SHALL NOT emit duplicate page requests for the
  same cursor.

#### Scenario: ACP Skills delegates transcript virtualization

- **GIVEN** the ACP Skills panel renders a selected run transcript
- **WHEN** it invokes the shared transcript renderer
- **THEN** it SHALL pass `virtualized: true`, the selected request id as the
  page key, and the selected transcript page as renderer input
- **AND** ACP Skills SHALL NOT maintain its own virtual transcript page cache,
  spacer rows, or scroll render handler.
