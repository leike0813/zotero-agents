## MODIFIED Requirements

### Requirement: Runtime log pipeline MUST persist logs through runtime persistence files

The runtime log pipeline MUST use runtime persistence files as the durable storage path for retained log documents after migration from prefs, and every production hydration and persistence operation MUST use Zotero-compatible asynchronous file APIs.

#### Scenario: Runtime log flush writes file storage

- **WHEN** retained runtime logs are flushed for persistence
- **THEN** the runtime log document SHALL be written through runtime persistence file storage
- **AND** the flush SHALL NOT resolve before the latest revision observed by its active drain is durably replaced
- **AND** the legacy `runtimeLogsJson` pref SHALL NOT remain the primary stored copy.

#### Scenario: Legacy prefs data is migrated

- **WHEN** runtime log hydration finds no runtime log file but finds valid legacy `runtimeLogsJson` pref data
- **THEN** the pipeline SHALL hydrate retained logs from the pref data
- **AND** persistence SHALL write the migrated document to runtime persistence file storage
- **AND** the legacy pref SHALL be cleared only after that write succeeds.

#### Scenario: Existing file cannot be hydrated

- **WHEN** runtime log file reading or parsing fails during explicit initialization
- **THEN** the pipeline SHALL leave the existing file unchanged
- **AND** it SHALL continue with an empty in-memory state and recorded persistence failure accounting.

#### Scenario: Log listing does not require prefs storage

- **WHEN** runtime logs have been flushed to runtime persistence files
- **THEN** log listing and diagnostic bundle creation SHALL read the retained in-memory state
- **AND** they SHALL NOT require `runtimeLogsJson` to contain the retained entries
- **AND** they SHALL NOT implicitly write persistence state.

## ADDED Requirements

### Requirement: Runtime log persistence MUST serialize retained entries once

The runtime log pipeline MUST use each accepted sanitized entry's single serialized representation as the persisted entry payload and byte-budget source of truth.

#### Scenario: Append retains a sanitized entry

- **WHEN** a sanitized runtime log entry is accepted
- **THEN** the pipeline SHALL serialize that entry once
- **AND** retention accounting and later document persistence SHALL reuse the cached serialization without serializing or deep-copying the entry again.

### Requirement: Runtime log persistence MUST order dirty revisions through one writer

The runtime log pipeline MUST allow no more than one retained-document save in flight, MUST preserve dirty state after a failed save, and MUST eventually save revisions created during an active write.

#### Scenario: Burst appends become dirty

- **WHEN** multiple entries are appended within the idle debounce window
- **THEN** the pipeline SHALL coalesce them behind one scheduled drain
- **AND** a continuous dirty burst SHALL be offered to persistence no later than the configured maximum-delay boundary.

#### Scenario: Entry arrives during a save

- **WHEN** a newer revision is created while an earlier revision is being written
- **THEN** no concurrent retained-document save SHALL start
- **AND** the active drain SHALL persist a subsequent document through the newer revision.

#### Scenario: Save fails

- **WHEN** atomic replacement of a dirty revision fails
- **THEN** the failure SHALL NOT be thrown into the runtime-log producer's business path
- **AND** the revision SHALL remain dirty so a later flush can retry it.

#### Scenario: Explicit flush or shutdown

- **WHEN** an explicit flush, clear, or shutdown drain begins
- **THEN** pending debounce timers SHALL be cancelled
- **AND** the caller SHALL be able to await completion of the required persistence drain.

### Requirement: Runtime log documents MUST use bounded atomic replacement

Runtime log documents MUST be emitted as bounded text chunks to a temporary file in the target directory and MUST replace the target only after all chunks are written successfully.

#### Scenario: Large document is persisted

- **WHEN** a retained document exceeds the physical append limit
- **THEN** its prefix, cached serialized entries, separators, and suffix SHALL be emitted in order
- **AND** no physical append SHALL exceed the surrogate-safe 256 KiB policy
- **AND** the complete document SHALL preserve the existing JSON schema and Unicode content.

#### Scenario: Chunk append fails before replacement

- **WHEN** any temporary-file append fails before the replace step
- **THEN** the existing target SHALL remain unchanged
- **AND** the temporary file SHALL be removed on a best-effort basis.

#### Scenario: All chunks succeed

- **WHEN** every temporary-file chunk is written successfully
- **THEN** the temporary file SHALL atomically replace the target
- **AND** no successful-operation temporary file SHALL remain.

### Requirement: Runtime log observation MUST avoid full snapshots on update paths

Runtime log append notifications and routine Runtime Logs UI refreshes MUST expose only the entry and aggregate data needed by their consumers.

#### Scenario: Listener observes an append or clear

- **WHEN** the retained log state changes
- **THEN** each listener SHALL receive a lightweight change event with revision and change metadata
- **AND** the event SHALL NOT contain a complete runtime-log snapshot.

#### Scenario: Runtime Logs page refreshes

- **WHEN** Task Manager refreshes the Runtime Logs page
- **THEN** it SHALL read aggregate summary data and at most 300 visible entries
- **AND** the refresh SHALL NOT construct a complete `RuntimeLogSnapshot`.

### Requirement: Runtime log cleanup MUST drain pending persistence first

Runtime persistence cleanup MUST await pending runtime-log save or clear work before removing the logs category storage.

#### Scenario: Logs category is cleared during a pending save

- **WHEN** logs-category cleanup starts while runtime-log persistence is in flight
- **THEN** cleanup SHALL await the registered asynchronous runtime-log clearer
- **AND** no late runtime-log write SHALL recreate the deleted directory after cleanup completes.
