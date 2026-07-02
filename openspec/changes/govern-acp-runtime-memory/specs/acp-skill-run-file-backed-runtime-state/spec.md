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
  `runnerJson`.

#### Scenario: Transcript is read on demand

- **GIVEN** ACP Skill run history contains many runs
- **WHEN** a summary or panel snapshot is built without opening a transcript
- **THEN** the system SHALL NOT load every run's transcript into memory
- **AND** only the selected run's transcript page MAY be loaded for display.

#### Scenario: Legacy embedded payload is migrated lazily

- **GIVEN** an existing ACP Skill run database payload contains embedded
  transcript or candidate text
- **WHEN** the run is selected, updated, or otherwise needs detail loading
- **THEN** the large values SHALL be written to runtime files
- **AND** the database payload SHALL be rewritten as metadata-only after a
  successful migration.

### Requirement: Transcript JSONL is the canonical transcript source

ACP Skill transcripts SHALL use a single append-only JSONL event log at
`<runtimeDir>/transcript.jsonl` as their canonical source.

#### Scenario: Transcript update appends an event

- **WHEN** an ACP Skill run records a transcript message, status, permission, or
  tool call update
- **THEN** the update SHALL append a JSON object containing `seq`, `op`,
  `itemId`, `item`, and `createdAt`
- **AND** rendering SHALL fold those events into the visible transcript.

#### Scenario: Transcript index is derived

- **GIVEN** `<runtimeDir>/transcript.index.json` is missing or stale
- **WHEN** the transcript is read
- **THEN** the index MAY be rebuilt from `transcript.jsonl`
- **AND** deleting the index SHALL NOT delete transcript truth.

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
