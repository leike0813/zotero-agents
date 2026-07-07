## ADDED Requirements

### Requirement: ACP Skills cold transcript rendering SHALL be page-first

ACP Skills SHALL render the selected cold run transcript page from the
file-backed transcript page reader without waiting for full mirror hydration.
Full mirror hydration MAY run in the background as a cache warm-up, but it SHALL
NOT be a correctness prerequisite for returning `selectedTranscriptPage`.

#### Scenario: Cold selected run returns indexed page

- **GIVEN** an ACP Skills run has durable transcript files
- **AND** its full transcript mirror is not loaded
- **WHEN** the Assistant Workspace requests the selected run panel snapshot
- **THEN** the snapshot SHALL include the selected transcript page read from the
  indexed transcript store
- **AND** the snapshot SHALL NOT wait for full mirror hydration to complete.

### Requirement: ACP Skills cold run selection SHALL be selection-first

ACP Skills SHALL publish a selected-run loading snapshot before any selected
cold run indexed page read or full mirror hydrate is allowed to block the UI.
Selecting a cold run SHALL update the selected owner first. Full mirror hydrate
SHALL NOT be scheduled by the selection operation itself.

#### Scenario: Cold run selection paints loading before page read

- **GIVEN** a cold ACP Skills run has durable transcript files
- **AND** its full transcript mirror is not loaded
- **WHEN** the user selects the run in Assistant Workspace
- **THEN** the first selected-run snapshot SHALL identify the newly selected
  run
- **AND** it SHALL report the selected transcript as loading
- **AND** it SHALL NOT include `selectedTranscriptPage`
- **AND** full mirror hydrate SHALL NOT begin before that loading snapshot.

#### Scenario: Page-first follow-up replaces loading

- **GIVEN** a loading-first snapshot has been published for a cold selected run
- **WHEN** Assistant Workspace performs the queued page-first follow-up
- **THEN** the follow-up snapshot SHALL read the selected page from the indexed
  transcript store
- **AND** full mirror hydrate MAY be scheduled only after the page-first path has
  had the opportunity to return the selected page.

### Requirement: ACP Skills cold full mirrors SHALL use a bounded LRU cache

ACP Skills SHALL keep loaded cold run full mirrors in an in-memory LRU cache
with 10 cold owner slots. Live, prompting, or lifecycle-open run mirrors SHALL
be pinned and SHALL NOT count against the cold cache slots.

#### Scenario: Cold run cache evicts least recently used owner

- **GIVEN** more than 10 cold run mirrors are loaded
- **WHEN** a new cold owner is retained
- **THEN** ACP Skills SHALL release the least recently used non-pinned cold
  mirror
- **AND** pinned live run mirrors SHALL remain loaded.

### Requirement: ACP Skills indexed page reads SHALL avoid per-event file opens

ACP Skills transcript page reads SHALL batch the byte-range reads needed for a
selected page so that a page containing many append events does not open and
close the transcript file once per event. The page reader MAY still use the
existing JSONL/index file format, but it SHALL preserve item ordering and fold
all indexed events for each returned item.

#### Scenario: Event-heavy page item reads through a batched range path

- **GIVEN** an ACP Skills transcript page item has many indexed event offsets
- **WHEN** the page reader loads that page from the transcript store
- **THEN** the reader SHALL return the folded item content
- **AND** it SHALL use a batched range read path rather than a per-event range
  helper.

### Requirement: Virtual transcript unloaded gaps SHALL show loading affordance

The shared virtual transcript renderer SHALL render a loading sentinel when the
visible viewport lands inside an unloaded page gap that has a previous or next
page cursor. The sentinel SHALL use the existing page request callback and SHALL
not create panel-specific page caches.

#### Scenario: User scrolls into an unloaded virtual gap

- **GIVEN** a virtual transcript has cached page rows and an unloaded adjacent
  page cursor
- **WHEN** the user scrolls into the spacer representing that unloaded page
  range
- **THEN** the renderer SHALL request the missing page
- **AND** it SHALL render a loading sentinel in the visible gap instead of a
  blank spacer-only viewport.
