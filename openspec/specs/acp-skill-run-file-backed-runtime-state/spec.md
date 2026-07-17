# acp-skill-run-file-backed-runtime-state Specification

## Purpose
Define the file-backed ACP Skills runtime, transcript paging, minimal Workspace
projection, independent UI state axes, and durable owner-scoped persistence
boundaries.
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

ACP Skills panel snapshots SHALL expose selected run transcript content only
through bounded UI-visible transcript page DTOs. The selected run metadata
projection SHALL NOT contain a full `transcriptItems` array.

#### Scenario: Initial selected snapshot carries bounded tail page

- **GIVEN** a selected ACP Skills run has more UI-visible transcript items than
  the default page size
- **WHEN** the host builds the ACP Skills panel snapshot without an explicit
  transcript cursor
- **THEN** the snapshot SHALL contain `selectedTranscriptPage.items` with no
  more than the default page size
- **AND** the snapshot SHALL include `cursor`, `prevCursor`, `nextCursor`,
  `total`, `eventSeq`, and `transcriptRevision`
- **AND** `selectedRun` SHALL NOT contain `transcriptItems`.

#### Scenario: ACP Skills selected page respects streaming render preference

- **GIVEN** a selected ACP Skills run has streaming message or thought rows in
  its canonical transcript mirror
- **AND** Assistant Workspace streaming render is disabled
- **WHEN** the host builds or reloads the selected transcript page
- **THEN** the selected page SHALL omit those streaming rows
- **AND** structural rows such as tool calls, status, plan, and permission rows
  SHALL remain eligible for display.

#### Scenario: ACP Skills transcript boundary reveals completed text

- **GIVEN** Assistant Workspace streaming render is disabled
- **AND** a selected ACP Skills run has hidden streaming text
- **WHEN** a transcript boundary marks that text complete
- **THEN** the next selected transcript page SHALL include the completed text.

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

### Requirement: Live transcript persistence is bounded and durable at semantic boundaries

ACP Skill live transcript events SHALL update the live mirror synchronously and SHALL be persisted through an owner-scoped buffered writer with bounded delay, payload, and entry thresholds.

#### Scenario: Synchronous transcript burst is physically batched

- **WHEN** one ACP Skill owner receives many synchronous compatible text chunks below a durability boundary
- **THEN** its live mirror, revision, item count, preview, and live delta SHALL reflect every chunk immediately
- **AND** the chunks SHALL be persisted using a bounded number of physical JSONL appends
- **AND** adjacent compatible `append_text` events MAY be coalesced without changing text order or final item semantics.

#### Scenario: Transcript durability boundary drains target owner

- **WHEN** an ACP Skill transcript page or full mirror is read, a user or interaction boundary is entered, a request becomes terminal or is applied, or the owner is disconnected, ended, archived, or released
- **THEN** pending transcript JSONL and required index checkpoint writes for that owner SHALL complete before the boundary returns
- **AND** unrelated owners SHALL NOT be required to flush.

#### Scenario: Shutdown drains live persistence

- **WHEN** the plugin performs controlled shutdown
- **THEN** pending ACP Skill transcript and metadata writes SHALL be drained within the existing bounded shutdown wait
- **AND** a failure or timeout SHALL emit structured diagnostics.

### Requirement: Transcript index checkpoints are derived and recoverable

The transcript index SHALL use a rebuildable format that records the durable JSONL source byte length and checkpoint time, and normal live writes SHALL checkpoint no more often than every 30 seconds or each additional 1 MiB of source data except at explicit durability boundaries.

#### Scenario: Valid stale index recovers JSONL tail

- **GIVEN** a valid current-version index has a `sourceByteLength` shorter than the transcript JSONL
- **WHEN** the transcript is read or forced durable
- **THEN** the store SHALL incrementally fold the unindexed JSONL tail
- **AND** the resulting page metadata, event sequence, offsets, previews, and items SHALL match the canonical JSONL.

#### Scenario: Old or invalid index rebuilds

- **GIVEN** the index is version 1, malformed, or records a source length greater than the current JSONL
- **WHEN** the transcript is read
- **THEN** the store SHALL rebuild a current index from the complete JSONL
- **AND** it SHALL NOT migrate or rewrite historical transcript events.

#### Scenario: Index failure does not negate transcript append

- **WHEN** JSONL append succeeds but an index checkpoint fails
- **THEN** the transcript append SHALL remain successful and canonical
- **AND** the index SHALL remain dirty for retry at the next durability boundary.

### Requirement: Soft ACP Skill metadata uses trailing persistence

ACP Skill transcript-only, usage, workspace activity, and non-terminal tool-call updates SHALL use bounded trailing metadata persistence, while semantic boundary state SHALL persist immediately.

#### Scenario: Soft metadata burst is coalesced

- **WHEN** many soft live updates arrive for one ACP Skill run within approximately two seconds
- **THEN** the in-memory run state SHALL reflect them immediately
- **AND** SQLite metadata persistence SHALL be coalesced into a bounded number of writes.

#### Scenario: Boundary metadata is immediate

- **WHEN** a user message, permission or interaction, plan, new tool call, terminal request, apply, disconnect, end, or archive boundary occurs
- **THEN** pending metadata for the target owner SHALL be persisted before the boundary returns
- **AND** a duplicate lifecycle event with the same stable identity SHALL NOT replace the same event row again.

### Requirement: ACP Skills silent transcript persists only critical outcomes

In silent mode, ACP Skills SHALL NOT create transcript events or soft run persistence for assistant chunks, thoughts, tools, plans, workspace activity, ordinary statuses, or pending/invalid output projections. User replies, permission/auth/waiting state, final validated output, terminal run state, and final apply outcome SHALL remain eligible for transcript persistence.

Separate output-revision evidence SHALL retain its existing business durability and SHALL NOT cause a pending or invalid candidate to appear in the silent transcript.

#### Scenario: chunks do not reach transcript writer

- **WHEN** a silent ACP Skills run receives assistant, thought, tool, plan, and usage updates
- **THEN** transcript metadata and writer diagnostics remain unchanged
- **AND** only semantic agent-message progress may change.

#### Scenario: final envelope is written once

- **GIVEN** silent output validation has produced invalid and pending revisions
- **WHEN** a final validated envelope is accepted
- **THEN** only the final envelope is projected as a complete assistant transcript item
- **AND** revision evidence remains available outside the transcript.

### Requirement: ACP Skills persists run message-count metadata

ACP Skills SHALL persist Assistant, Thought, and Tool current/cumulative count metadata in the selected run record independently of transcript persistence. One user-originated run or explicit user retry SHALL define the current execution; automatic validation repair, recovery, or backend retry SHALL NOT reset current counts.

#### Scenario: terminal run retains counts

- **WHEN** an ACP Skills run reaches a terminal state
- **THEN** its last current and cumulative category values remain in the run record
- **AND** reopening the run restores those values without transcript hydration.

#### Scenario: automatic repair remains in current execution

- **WHEN** output validation automatically requests a repair attempt
- **THEN** new semantic activity continues the existing current count
- **AND** current counts are not reset.

#### Scenario: legacy run exposes current values only

- **WHEN** a persisted run lacks complete count metadata
- **THEN** new current activity may be counted
- **AND** no cumulative denominator is synthesized from transcript item totals.

### Requirement: Skills uses the shared transcript region and domain mapping

ACP Skills SHALL publish transcript through the shared transcript region, progress as shared message counts, and runtime options as shared reply state. Run, selection, archive, and global changes SHALL use explicit structural mappings. Skills SHALL NOT expose a selected-run-specific transcript lifecycle or page field to Workspace.

#### Scenario: Selected run transcript changes

- **WHEN** the selected request emits a UI-visible transcript mutation
- **THEN** Skills passes the normalized mutation through the same projection and coordinator as Chat.

### Requirement: Skills Replay releases production hard boundaries

Workflow Replay turn-end, root-end, and request terminal events SHALL invoke the same hard-boundary release seam used by production Skills execution. Text held in boundary mode SHALL become visible exactly once at the semantic boundary.

#### Scenario: Text-only replay turn ends

- **WHEN** a turn contains assistant text chunks and no structural update
- **THEN** turn-end releases the text into a transcript delta
- **AND** the rendered Skills transcript remains visible until cleanup.

### Requirement: Skills storage remains unchanged

Publication migration SHALL NOT alter run persistence, transcript JSONL/index, recovery, archive, workflow behavior, or request-id ownership. Store-specific fields SHALL be normalized at the adapter boundary.

#### Scenario: Recovered run is selected

- **WHEN** a persisted run is restored and selected
- **THEN** its indexed page is normalized to the same shared region used by live execution.

### Requirement: Skills transcript delivery and rendering matches Chat

ACP Skills SHALL use the same generation-scoped Shell retention, shared child FIFO, item mutation model, render effects, terminal acknowledgement, and rebase decisions as ACP Chat. Skills SHALL NOT retain a surface-specific transcript publication or full-page render state machine.

#### Scenario: Equivalent Chat and Skills updates are normalized

- **WHEN** equivalent visible item sequences are applied to Chat and Skills
- **THEN** their normalized publication form, mutation operation, revision transition, render effect, and acknowledgement decision are identical apart from owner and item content
- **AND** neither surface rebuilds unaffected rows.

### Requirement: Skills publication count is display-projected

ACP Skills SHALL keep raw run transcript counts inside its domain store and SHALL expose `totalVisibleItemCount` to Workspace only through the selected display projection. Snapshot and delta metadata SHALL use the same projected count.

#### Scenario: Skills holds boundary text

- **WHEN** a Skills assistant chunk is stored but not yet UI-visible
- **THEN** the Workspace visible count remains unchanged until release.

### Requirement: Skills ordinary progress uses shared message counts

ACP Skills non-silent tool and progress changes SHALL publish the same canonical message-count region semantics as ACP Chat where applicable. Progress SHALL NOT be restricted to the silent-mode path.

#### Scenario: Ordinary tool boundary advances progress

- **WHEN** a non-silent Skills run accepts a tool boundary that changes semantic progress
- **THEN** the adapter emits transcript and message-count domain changes through the shared runtime
- **AND** neither change materializes a full run panel.

### Requirement: Skills Workspace reads a minimal owner model

ACP Skills Workspace SHALL read one minimal owner DTO per publication batch and
SHALL NOT clone complete run events or construct a panel snapshot before
selecting regions. Diagnostics SHALL use a separate DTO.

#### Scenario: Copy diagnostics is requested

- **WHEN** the user copies run diagnostics
- **THEN** the store returns the diagnostics DTO
- **AND** no transcript page or panel presentation is constructed.

### Requirement: Skills presentation preserves owner semantics

Skills title SHALL prefer task name, workflow label, then skill id. Subtitle and
sequence semantics, owner status fields, banner metadata/usage/recovery/workspace
details, and diagnostics SHALL remain visible through owner presentation.

#### Scenario: A sequence task is selected

- **WHEN** the selected run has sequence and workflow metadata
- **THEN** its title/subtitle retain step and workflow meaning
- **AND** switching tasks preserves unrelated keyed task-card DOM identity.

### Requirement: Skills presentation preserves independent state axes

Skills drawer task state SHALL derive from the workflow-task projection SSOT.
Selected run lifecycle, backend state, apply state, recovery, and connection
SHALL remain independent and missing values SHALL remain absent.

#### Scenario: A run waits for permission

- **WHEN** the run has a pending permission request
- **THEN** the drawer task state is `waiting_user`
- **AND** missing backend status is not replaced with the run status.

### Requirement: Skills empty selection preserves workspace geometry

An empty Skills selection SHALL use the shared conversation empty state while
keeping transcript and composer layout containers mounted.

#### Scenario: The final visible task is archived

- **WHEN** no selected run remains
- **THEN** the empty state is visible in the conversation region
- **AND** the reply footer and transcript region do not collapse the panel.

### Requirement: Skills publishes plan independently from transcript and chrome

ACP Skills SHALL project active run plan entries from the run/task SSOT into
the v1 plan region. Plan changes SHALL publish only plan work and SHALL NOT be
encoded as transcript, presentation, or full-run snapshot changes.

#### Scenario: A running plan entry advances

- **WHEN** a selected run updates an active plan entry without changing transcript content
- **THEN** only the plan region is published and rendered
- **AND** transcript, toolbar, banner, hint, composer, and drawer nodes retain identity.

### Requirement: Skills details use a bounded file-backed read model

Skills owner details SHALL read only the selected run's bounded path, runner,
validation, runtime dependency, output revision, runtime log, and validated
result sections on demand. Task status, backend status, apply status, attention,
and title/subtitle SHALL remain derived from the run/task projection SSOT and
SHALL NOT be inferred from details or transcript presentation.

#### Scenario: A terminal run opens details

- **WHEN** the user opens Details for a terminal run
- **THEN** the Host reads bounded detail sections and lazily reads validated result JSON
- **AND** no transcript history or complete run snapshot is materialized.
