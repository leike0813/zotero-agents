## ADDED Requirements

### Requirement: Selected ACP Skills transcript snapshots are paged

ACP Skills panel snapshots SHALL expose selected run transcript content only through bounded transcript page DTOs. The selected run metadata projection SHALL NOT contain a full `transcriptItems` array.

#### Scenario: Initial selected snapshot carries bounded tail page

- **GIVEN** a selected ACP Skills run has more transcript items than the default page size
- **WHEN** the host builds the ACP Skills panel snapshot without an explicit transcript cursor
- **THEN** the snapshot SHALL contain `selectedTranscriptPage.items` with no more than the default page size
- **AND** the snapshot SHALL include `cursor`, `prevCursor`, `nextCursor`, `total`, `eventSeq`, and `transcriptRevision`
- **AND** `selectedRun` SHALL NOT contain `transcriptItems`.

#### Scenario: Cursor page request reads requested window

- **GIVEN** a selected ACP Skills run has a loaded transcript mirror
- **WHEN** the child requests a transcript page by cursor and limit
- **THEN** the host SHALL return the requested bounded transcript window
- **AND** the page metadata SHALL expose whether older or newer pages are available.

#### Scenario: Transcript hydrate remains asynchronous

- **GIVEN** a selected ACP Skills run has a durable transcript that is not loaded into the mirror
- **WHEN** the host prepares a panel snapshot
- **THEN** the snapshot SHALL report the selected transcript state as loading
- **AND** the host SHALL NOT synchronously materialize the full transcript into the snapshot.

### Requirement: ACP Skills child transcript browsing is bounded

The ACP Skills child panel SHALL support scrolling through paged transcript history without keeping the complete transcript in host-to-child payloads or DOM nodes.

#### Scenario: Scrolling loads older transcript page

- **GIVEN** the ACP Skills child panel displays the selected run tail page
- **AND** an older page is available
- **WHEN** the user scrolls near the cached transcript top
- **THEN** the child SHALL request the previous transcript page by cursor
- **AND** it SHALL merge the returned page into a bounded local page cache.

#### Scenario: Virtual rendering limits DOM work

- **GIVEN** the child has cached more transcript items than the virtual render window
- **WHEN** the transcript is rendered
- **THEN** the child SHALL pass only the visible window plus buffer to the shared transcript renderer
- **AND** it SHALL preserve scroll continuity with spacer elements.
