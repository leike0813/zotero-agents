# acp-chat-file-backed-transcript-state Specification

## Purpose
TBD
## Requirements
### Requirement: ACP Chat transcript state is file-backed

ACP Chat SHALL store user-facing conversation transcripts in files under the
conversation storage directory instead of storing transcript items in database
rows, session slots, or UI snapshots.

#### Scenario: New chat conversation stores metadata-only database payload

- **WHEN** ACP Chat persists a conversation
- **THEN** the database request payload SHALL contain only metadata, paths,
  counters, revisions, timestamps, and bounded previews
- **AND** it SHALL NOT contain complete transcript items
- **AND** `plugin_task_rows` SHALL NOT contain ACP Chat transcript item payloads.

#### Scenario: Chat snapshot is metadata-only

- **WHEN** ACP Chat publishes a frontend snapshot
- **THEN** the snapshot SHALL NOT contain complete transcript item arrays
- **AND** transcript display SHALL require either an explicit asynchronous page
  request or a live transcript delta for the currently selected conversation.

#### Scenario: Streaming chat text does not accumulate in session memory

- **WHEN** assistant or thought streaming chunks arrive
- **THEN** the first chunk for a new transcript item SHALL create an
  `upsert_item` event whose item text contains that first chunk
- **AND** subsequent chunks SHALL append transcript text events
- **AND** the ACP Chat session slot SHALL NOT retain the full accumulated text.

### Requirement: ACP Chat transcript paging and live deltas share the ACP transcript model

ACP Chat SHALL use the same JSONL operation model, bounded previews, indexed
page reads, and ephemeral live delta semantics as ACP Skills.

#### Scenario: Chat transcript page loads asynchronously

- **WHEN** the UI requests a Chat transcript page without a cursor
- **THEN** the transcript store SHALL return the tail page
- **AND** the response SHALL include `items`, `cursor`, `prevCursor`,
  `nextCursor`, `total`, and `eventSeq`.

#### Scenario: Live delta is not persistence truth

- **WHEN** a live Chat transcript delta is lost, overflows, or arrives out of
  sequence
- **THEN** the UI SHALL use JSONL page reload as the recovery source
- **AND** tail-page views SHALL reload the tail page
- **AND** historical-page views SHALL NOT append off-page new items or force a
  jump to the tail.

#### Scenario: Delta overflow is explicit

- **WHEN** the live Chat transcript delta batch exceeds the configured item or
  size bound
- **THEN** the host SHALL send a lightweight `resyncRequired` delta
- **AND** it SHALL NOT silently drop earlier deltas while sending the remaining
  tail of the batch as if it were complete.

### Requirement: Legacy ACP Chat transcript rows are reset, not migrated

ACP Chat SHALL NOT preserve compatibility with old database transcript rows for
this change.

#### Scenario: Old rows exist in the local test database

- **WHEN** the v4 test data reset runs
- **THEN** ACP Chat conversation/index/frontend request rows SHALL be removed
- **AND** ACP Chat transcript task rows for those conversations SHALL be removed
- **AND** ACP Chat conversation/runtime workspace directories SHALL be removed.

### Requirement: ACP Chat UI snapshots SHALL support structural transcript item reads

ACP Chat SHALL expose an explicit UI snapshot read mode that returns transcript
structure without complete transcript content. The default UI snapshot read mode
SHALL remain full until the ACP Chat child panel is migrated to page-based
rendering.

#### Scenario: Default UI snapshot remains full

- **WHEN** ACP Chat code requests a UI snapshot without an item mode option
- **THEN** the snapshot retains the existing full transcript item behavior.

#### Scenario: Structural UI snapshot omits transcript content rows

- **WHEN** ACP Chat code requests a UI snapshot with structural item mode
- **THEN** the snapshot items SHALL include plan items only
- **AND** it SHALL NOT include message, thought, or tool-call transcript items
- **AND** transcript metadata such as revision, count, preview, and state SHALL
  remain available.

#### Scenario: Structural publish does not retain full transcript items

- **WHEN** ACP Chat publishes a structural UI snapshot
- **THEN** the published UI snapshot SHALL NOT retain message, thought, or
  tool-call transcript items even if the transcript mirror is loaded.
