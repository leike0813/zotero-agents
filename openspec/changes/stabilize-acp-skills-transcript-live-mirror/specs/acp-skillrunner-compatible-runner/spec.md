## ADDED Requirements

### Requirement: ACP Skills direct transcript rendering

ACP Skills SHALL use a store-owned in-memory transcript mirror as the authoritative transcript source for lifecycle-open runs and the selected foreground run, and the selected run snapshot SHALL carry the transcript items rendered by the front-end when the mirror is ready.

#### Scenario: Selected run snapshot carries transcript

- **GIVEN** an ACP Skills run is the selected foreground run
- **WHEN** the ACP Skills panel snapshot is prepared
- **THEN** `selectedRun.transcriptItems` SHALL contain the current transcript mirror items
- **AND** the front-end SHALL render those items directly without requesting transcript pages or applying transcript deltas.

#### Scenario: Transcript events update mirror before persistence

- **WHEN** ACP Skills queues a transcript event
- **THEN** the store SHALL fold the event into the memory mirror before notifying snapshot listeners
- **AND** JSONL persistence SHALL remain asynchronous durable storage.

#### Scenario: ACP Skills page delta protocol is absent

- **WHEN** the ACP Skills front-end needs transcript content
- **THEN** it SHALL use only the current panel snapshot
- **AND** it SHALL NOT send `load-transcript-page`
- **AND** the host SHALL NOT send ACP Skills `transcript-page` or `transcript-delta` child snapshots.

#### Scenario: Lifecycle-open non-foreground run retains transcript item mirror

- **GIVEN** an ACP Skills run is no longer prompt-active
- **AND** output convergence, apply, reply, recovery, permission, or connection work remains open
- **AND** the run is not the selected foreground run
- **WHEN** the store prunes live transcript memory
- **THEN** it SHALL retain transcript item mirror data for that run.

#### Scenario: Lifecycle-settled non-foreground run releases transcript item mirror

- **GIVEN** an ACP Skills run is lifecycle-settled
- **AND** the run is not the selected foreground run
- **WHEN** the store prunes live transcript memory
- **THEN** it SHALL release transcript item mirror data for that run
- **AND** it SHALL clear transient transcript continuity metadata.

#### Scenario: Released foreground run cold hydrates without blocking state snapshot

- **GIVEN** an ACP Skills run has a released transcript mirror
- **AND** the run is selected again while no prompt is active
- **WHEN** the selected run snapshot is prepared
- **THEN** the store SHALL return the selected run state immediately
- **AND** `selectedTranscript.state` SHALL be `"loading"` until JSONL hydrate completes
- **AND** a later snapshot SHALL carry `selectedRun.transcriptItems` from the rebuilt mirror.

#### Scenario: Released mirror receives transcript event before hydrate

- **GIVEN** an ACP Skills run has a durable JSONL transcript
- **AND** its in-memory mirror is released
- **WHEN** a transcript event is queued before the mirror hydrates
- **THEN** the store SHALL NOT mark an empty or partial mirror as ready
- **AND** the selected run SHALL still cold hydrate from JSONL before rendering transcript items.

#### Scenario: Recovery hydrates before new transcript append

- **GIVEN** an ACP Skills run has a released transcript mirror
- **WHEN** the run is recovered, replied to, or otherwise re-enters a prompt path
- **THEN** the store SHALL hydrate the mirror from JSONL before appending new transcript events
- **AND** subsequent selected run snapshots SHALL include old transcript content followed by new content.

#### Scenario: JSONL persistence is batched outside the live render path

- **GIVEN** a prompt-active ACP Skills run emits many transcript chunks
- **WHEN** transcript events are persisted
- **THEN** JSONL writes SHALL be queued asynchronously and may be batched
- **AND** selected run snapshots SHALL be produced from memory without waiting for those writes.

#### Scenario: Transcript-only updates do not rebuild non-transcript panel regions

- **GIVEN** ACP Skills is rendering a selected prompting run
- **WHEN** only transcript items or transcript revision change
- **THEN** the front-end SHALL update the transcript renderer
- **AND** it SHALL NOT rebuild toolbar, details drawer, reply, or context drawer regions.
