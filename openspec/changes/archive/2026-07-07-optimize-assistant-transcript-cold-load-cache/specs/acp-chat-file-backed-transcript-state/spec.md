## ADDED Requirements

### Requirement: ACP Chat cold transcript rendering SHALL be page-first

ACP Chat SHALL render the selected cold conversation transcript page from the
file-backed transcript page reader without waiting for full mirror hydration.
Full mirror hydration MAY run in the background as a cache warm-up, but it SHALL
NOT be a correctness prerequisite for returning `selectedTranscriptPage`.

#### Scenario: Cold selected conversation returns indexed page

- **GIVEN** an ACP Chat conversation has durable transcript files
- **AND** its full transcript mirror is not loaded
- **WHEN** the Assistant Workspace requests the selected panel snapshot
- **THEN** the snapshot SHALL include the selected transcript page read from the
  indexed transcript store
- **AND** the snapshot SHALL NOT wait for full mirror hydration to complete.

### Requirement: ACP Chat cold full mirrors SHALL use a bounded LRU cache

ACP Chat SHALL keep loaded cold conversation full mirrors in an in-memory LRU
cache with 10 cold owner slots. Live or prompting conversation mirrors SHALL be
pinned and SHALL NOT count against the cold cache slots.

#### Scenario: Cold conversation cache evicts least recently used owner

- **GIVEN** more than 10 cold conversation mirrors are loaded
- **WHEN** a new cold owner is retained
- **THEN** ACP Chat SHALL release the least recently used non-pinned cold
  mirror
- **AND** pinned live mirrors SHALL remain loaded.

### Requirement: ACP Chat selected owner transitions SHALL be owner-first

ACP Chat selected backend/conversation changes SHALL publish the new selected
owner before any indexed page read or full mirror hydrate is allowed to block
the UI. Selection operations SHALL update only the active owner and SHALL NOT
schedule full hydrate. Assistant Workspace SHALL then publish a loading-first
snapshot for the new owner and queue a page-first follow-up guarded by the
current owner key.

#### Scenario: Cold conversation selection paints owner before page read

- **GIVEN** an ACP Chat conversation has durable transcript files
- **AND** its full transcript mirror is not loaded
- **WHEN** the user selects that conversation in Assistant Workspace
- **THEN** ACP Chat SHALL first publish a snapshot for the newly selected owner
  without reading the selected page
- **AND** it SHALL show loading or empty transcript state for that owner
- **AND** full mirror hydrate SHALL NOT start before that loading-first
  snapshot path.

#### Scenario: Page-first follow-up warms mirror after selected page read

- **GIVEN** a loading-first snapshot has been published for a selected ACP Chat
  conversation
- **WHEN** Assistant Workspace performs the guarded page-first follow-up
- **THEN** ACP Chat SHALL read the selected page from the indexed transcript
  store
- **AND** it MAY schedule background full mirror hydrate only after the selected
  page path has returned.
