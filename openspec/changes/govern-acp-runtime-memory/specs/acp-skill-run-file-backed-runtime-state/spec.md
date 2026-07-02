## ADDED Requirements

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
  JSONL items from disk.

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

#### Scenario: Assistant turn text is file-backed

- **WHEN** the ACP runner captures assistant chunks for output convergence
- **THEN** chunks SHALL be appended to `<runtimeDir>/turns/<turnId>.assistant.txt`
- **AND** convergence SHALL read the turn file at the prompt boundary
- **AND** the controller SHALL NOT accumulate the turn in an unbounded string.

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
