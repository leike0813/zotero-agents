# acp-skill-run-file-backed-runtime-state Specification

## Purpose
TBD
## Requirements
### Requirement: ACP Skill runtime state is file-backed

ACP Skills SHALL store user-facing transcripts, output revision candidates, and
continuation context in files under the run runtime directory instead of using
the plugin run store payload as the canonical storage for those large values.

#### Scenario: New run stores metadata-only database payload

- **GIVEN** an ACP Skill run records transcript messages, output candidates,
  request context, and final result data
- **WHEN** the run is persisted
- **THEN** the plugin run store payload SHALL contain only metadata, paths,
  counters, revisions, timestamps, and bounded previews
- **AND** it SHALL NOT contain the complete transcript
- **AND** it SHALL NOT contain full candidate text
- **AND** it SHALL NOT contain complete `resultJson`, `requestPayload`, or
  `runnerJson`
- **AND** pending interaction state SHALL contain only bounded previews and file
  references, not complete candidate text.

#### Scenario: Panel snapshot is metadata-only

- **GIVEN** ACP Skill run history contains many runs
- **WHEN** a summary, panel snapshot, or selected run detail is built
- **THEN** the system SHALL NOT load every run's transcript into memory
- **AND** the snapshot SHALL NOT contain a `transcriptItems` array
- **AND** the snapshot SHALL NOT contain an `outputRevisions` array
- **AND** the snapshot SHALL NOT contain `requestPayload`, `runnerJson`,
  `resultJson`, `lastTurnOutput`, or `pendingInteraction.candidateText`
- **AND** transcript display SHALL require an explicit asynchronous transcript
  page request.

#### Scenario: Runtime context is dirty-written

- **GIVEN** an ACP Skill run has written `run-context.json`
- **WHEN** streaming transcript chunks, usage, plan, or tool updates arrive
- **THEN** those updates SHALL NOT rewrite `run-context.json`
- **AND** context writes SHALL occur only when request, runner, provider
  options, workspace/runtime references, or materialization references change.

#### Scenario: Legacy embedded payload is not migrated

- **GIVEN** an old ACP Skill run database payload contains embedded transcript
  or candidate text
- **WHEN** ACP Skill run history is hydrated
- **THEN** hydration SHALL NOT fold or retain those large embedded values
- **AND** local test data cleanup SHALL remove affected old ACP Skill run rows
  instead of relying on compatibility migration.

### Requirement: Transcript JSONL is the canonical transcript source

ACP Skill transcripts SHALL use a single append-only JSONL event log at
`<runtimeDir>/transcript.jsonl` as their canonical source.

#### Scenario: Transcript update appends an event

- **WHEN** an ACP Skill run records a transcript message, status, permission, or
  tool call update
- **THEN** the update SHALL append a JSON object containing `seq`, `op`,
  `itemId`, `createdAt`, and the operation payload
- **AND** supported operations SHALL include `upsert_item`, `append_text`,
  `patch_item`, and `delete_item`.

#### Scenario: Transcript index is derived

- **GIVEN** `<runtimeDir>/transcript.index.json` is missing or stale
- **WHEN** the transcript is read
- **THEN** the index MAY be rebuilt from `transcript.jsonl`
- **AND** deleting the index SHALL NOT delete transcript truth.

#### Scenario: Transcript preview is indexed

- **WHEN** a transcript event is appended
- **THEN** the rebuildable transcript index SHALL update bounded item/root
  previews from the event payload
- **AND** append-time preview generation SHALL NOT reread and fold transcript
  JSONL items from disk
- **AND** plan-style transcript items SHALL produce bounded previews from their
  plan entry content when present.

#### Scenario: Transcript page loads asynchronously

- **GIVEN** an ACP Skill run has a transcript with more than one page of items
- **WHEN** the UI requests a transcript page without a cursor
- **THEN** the transcript store SHALL return the tail page
- **AND** the response SHALL include `items`, `cursor`, `prevCursor`,
  `nextCursor`, `total`, and `eventSeq`
- **AND** the store SHALL materialize only items in the requested page during a
  normal indexed read.

#### Scenario: Streaming chunks do not accumulate in memory

- **WHEN** assistant streaming text arrives for an ACP Skill run
- **THEN** each chunk SHALL be appended to the transcript event log or a
  file-backed text event
- **AND** the ACP Skill run record and live controller SHALL NOT retain the full
  accumulated assistant text.

#### Scenario: Live delta respects historical page browsing

- **WHEN** the ACP Skills UI is displaying a historical transcript page
- **AND** live transcript deltas arrive for the selected run
- **THEN** new off-page items SHALL NOT be appended to the visible historical
  page
- **AND** missing-target deltas SHALL NOT force a tail-page reload.

#### Scenario: Assistant turn text is prompt-local

- **WHEN** the ACP runner captures assistant chunks for output convergence
- **THEN** chunks SHALL be folded into a prompt-lifetime accumulator
- **AND** convergence SHALL read that accumulator at the prompt boundary
- **AND** the runner SHALL NOT write a secondary `.assistant.txt` turn capture
  beside the transcript JSONL.

### Requirement: Runtime file retention follows run workspace retention

ACP Skill runtime files SHALL live under the run workspace/runtime directory so
archived terminal run cleanup removes transcript, output revision, continuation
context, and final result artifacts together.

#### Scenario: Archived terminal run expires

- **GIVEN** an ACP Skill run is terminal, archived or removed, and older than the
  task history retention threshold
- **WHEN** retention cleanup runs
- **THEN** the persisted run row SHALL be deleted
- **AND** the run workspace SHALL be deleted
- **AND** `transcript.jsonl`, `output-revisions.jsonl`, and `run-context.json`
  under that workspace SHALL be deleted.

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

### Requirement: ACP Skills panel uses bounded recent run index

ACP Skills panel snapshots SHALL build their recent run list from a bounded
in-memory index of visible run records instead of scanning and sorting all ACP
run history on every panel refresh.

#### Scenario: Panel refresh reads bounded recent runs

- **GIVEN** ACP Skill run history contains more visible run records than the
  panel display limit
- **WHEN** an ACP Skills panel snapshot is prepared
- **THEN** the recent run list SHALL be read from the recent visible run index
- **AND** the refresh SHALL NOT perform a full run-record scan
- **AND** candidate reads SHALL be bounded by the panel display limit plus the
  truncation sentinel.

#### Scenario: Explicit old selection remains visible

- **GIVEN** a user explicitly selects a visible ACP Skill run outside the recent
  panel index window
- **WHEN** an ACP Skills panel snapshot is prepared for that selection
- **THEN** the selected run SHALL remain visible in the panel snapshot
- **AND** the panel refresh SHALL NOT perform a full run-record scan.

#### Scenario: Drawer notice is section independent

- **GIVEN** an ACP Skills drawer has a history truncation notice
- **AND** its visible sections do not include a non-empty running section
- **WHEN** the drawer is rendered
- **THEN** the notice SHALL still be displayed.
