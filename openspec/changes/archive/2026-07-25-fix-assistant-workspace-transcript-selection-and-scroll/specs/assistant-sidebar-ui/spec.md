## ADDED Requirements

### Requirement: Tail-follow renders the tail window without speculative history requests

When the virtual transcript renderer follows the tail (stick-to-bottom intent), it SHALL compute the render window from the tail of the virtual layout rather than the container's pre-stick `scrollTop`, and the loading-gap evaluation SHALL use the same tail position. A tail-follow render SHALL NOT emit page requests or loading sentinels for gaps the tail window cannot reveal. Non-stick renders SHALL continue to compute the window from the live `scrollTop`.

#### Scenario: First stick-to-bottom render of a long transcript

- **GIVEN** a virtual transcript whose cached tail page has an unloaded previous page
- **AND** the container is in stick-to-bottom state
- **WHEN** the first render for an owner commits
- **THEN** the window SHALL cover the tail rows of the cached page
- **AND** no previous-page request or loading sentinel SHALL be emitted for the offscreen gap
- **AND** the transcript SHALL NOT flash a top-spacer frame before sticking to the bottom.

#### Scenario: Short transcript still prefetches the visible gap

- **GIVEN** a virtual transcript whose full layout fits inside the viewport
- **AND** the container is in stick-to-bottom state
- **WHEN** the first render commits with an unloaded previous page
- **THEN** the renderer MAY request the previous page and show its loading sentinel, because the gap is visible from the tail position.

### Requirement: Incremental renders keep scroll bookkeeping in sync

After an incremental transcript effect restores the viewport anchor or the preserved scroll position, the renderer SHALL write the resulting `scrollTop` to the last-scroll-top marker, matching the full render path. Scroll bookkeeping SHALL NOT leave a stale marker that a later scroll event can misread as an upward user scroll.

#### Scenario: Anchor restore after a tail patch

- **GIVEN** a virtual transcript is anchored away from the bottom
- **WHEN** an incremental effect restores the viewport
- **THEN** the last-scroll-top marker SHALL equal the restored `scrollTop`
- **AND** the tail-follow state SHALL NOT be cleared unless a real user scroll moves upward.
