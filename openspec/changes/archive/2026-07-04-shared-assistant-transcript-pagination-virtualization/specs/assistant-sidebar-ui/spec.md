## ADDED Requirements

### Requirement: Shared transcript renderer owns paginated virtualization

The shared Assistant transcript renderer SHALL own paginated transcript
virtualization, page cache state, spacer rows, scroll anchoring, page request
dedupe, and stickiness behavior for panels that opt into virtualized rendering.

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
