# acp-chat-file-backed-transcript-state Specification

## Purpose
Define the ACP Chat durable transcript storage, paging, live-delta recovery,
and UI snapshot boundaries so transcript content can be read through explicit
page APIs without being retained in database rows or full panel snapshots.
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

### Requirement: ACP Chat transcript page reads SHALL expose stable conversation scope

ACP Chat SHALL expose a transcript page reader that returns durable transcript
store pages with explicit backend and conversation scope metadata. Existing
callers that consume page `items` SHALL continue to work.

#### Scenario: Current conversation page includes scope metadata

- **WHEN** ACP Chat code reads a transcript page for the current conversation
- **THEN** the response SHALL include `backendId`, `conversationId`,
  `requestId`, `items`, `cursor`, `total`, `eventSeq`, `transcriptRevision`,
  and `limit`
- **AND** `requestId` SHALL be stable for the backend/conversation pair.

#### Scenario: Background conversation page read does not switch active state

- **WHEN** ACP Chat code reads a transcript page for an explicit background
  conversation
- **THEN** the response SHALL use that conversation's durable transcript page
- **AND** the active conversation SHALL NOT change.

#### Scenario: Page reader flushes only the target conversation writes

- **WHEN** ACP Chat code reads a transcript page while the target conversation
  has pending transcript writes
- **THEN** the reader SHALL wait for that target conversation's writes before
  reading the durable transcript page
- **AND** it SHALL NOT require unrelated ACP Chat conversations to be flushed.

#### Scenario: Page boundary metadata is preserved

- **WHEN** ACP Chat code reads a tail page or a cursor page
- **THEN** the response SHALL preserve the durable store's `cursor`,
  `prevCursor`, `nextCursor`, `total`, and `eventSeq` page metadata.

### Requirement: ACP Chat child snapshots deliver a selected transcript page for virtualized rendering

ACP Chat child snapshots MUST deliver structural panel data plus a selected
transcript page from the selected conversation read-model instead of full
transcript content rows when transcript pagination virtualization is enabled.

#### Scenario: Virtualized ACP Chat snapshot includes selected mirror page

- **WHEN** ACP Chat is rendered with transcript pagination virtualization
  enabled
- **AND** the active conversation transcript mirror is ready
- **THEN** the host snapshot SHALL use structural transcript items for panel
  chrome
- **AND** it SHALL include `selectedTranscriptPage` for the active
  backend/conversation scope
- **AND** that page SHALL be read from the hydrated conversation mirror.

#### Scenario: Loading ACP Chat transcript omits selected page

- **WHEN** ACP Chat is rendered with transcript pagination virtualization
  enabled
- **AND** the active conversation transcript mirror is loading or failed
- **THEN** the host snapshot SHALL include the selected transcript state
- **AND** it SHALL omit `selectedTranscriptPage`
- **AND** it SHALL NOT read a durable transcript page as a panel fallback.

#### Scenario: ACP Chat selected page respects streaming render preference

- **WHEN** the active conversation mirror contains streaming message or thought
  rows
- **AND** Assistant Workspace streaming render is disabled
- **THEN** ACP Chat selected transcript pages SHALL omit those streaming rows
- **AND** structural transcript rows SHALL remain eligible for display.

#### Scenario: ACP Chat append refresh respects streaming render preference

- **WHEN** an active ACP Chat `transcript-append` change is emitted
- **THEN** the workspace host SHALL refresh the ACP Chat child snapshot only
  when streaming render is enabled
- **AND** `transcript-boundary` changes SHALL refresh the selected snapshot
  regardless of the streaming render preference.

### Requirement: ACP Chat panel snapshots are prepared by a no-refresh read-model

ACP Chat panel publication MUST prepare child snapshots through a selected
conversation read-model that does not refresh backend registries or hydrate full
transcript content synchronously into the panel payload.

#### Scenario: Mirror page read failure keeps panel chrome

- **WHEN** a selected transcript mirror page cannot be read
- **THEN** the panel read-model SHALL still return ACP Chat toolbar, backend,
  session, status, and frontend metadata
- **AND** it SHALL omit `selectedTranscriptPage` for that snapshot.

### Requirement: ACP Chat panel publication is driven by typed filtered changes

ACP Chat panel publication MUST use typed change notifications with host-side
filtering instead of untyped high-frequency frontend snapshot reposts.

#### Scenario: Active chrome changes refresh the panel

- **WHEN** the active ACP Chat scope, status, permission, session list,
  runtime options, backend metadata, or transcript boundary changes
- **THEN** the assistant workspace SHALL post a no-refresh ACP Chat panel
  snapshot.

#### Scenario: Pure append changes do not rebuild virtualized panel snapshots

- **WHEN** transcript pagination virtualization is enabled
- **AND** the only ACP Chat panel change is an active transcript append
- **THEN** the assistant workspace SHALL NOT rebuild the full ACP Chat panel
  snapshot.

#### Scenario: Background transcript-only changes do not refresh the active panel

- **WHEN** a background ACP Chat conversation emits transcript-only changes
- **THEN** the assistant workspace SHALL NOT refresh the active ACP Chat child
  snapshot.

#### Scenario: Explicit backend refresh settles into one no-refresh repost

- **WHEN** ACP Chat backend refresh completes at an explicit lifecycle boundary
- **THEN** it MAY emit a typed backend/global panel change
- **AND** the resulting assistant workspace snapshot repost SHALL use the
  no-refresh ACP Chat panel read-model.

#### Scenario: Failed delivery models remain absent

- **WHEN** ACP Chat panel publication is implemented
- **THEN** it SHALL NOT introduce `notifyFrontend: false` delivery
- **AND** it SHALL NOT introduce listener item-mode maps or session index
  caches.

### Requirement: ACP Chat assistant text SHALL coalesce across soft side-channel updates

ACP Chat transcript normalization SHALL keep an active assistant text segment
open across ACP update kinds that do not represent a user-visible assistant turn
boundary. `tool_call_update`, usage updates, status updates, and workspace
activity SHALL NOT complete or replace the active assistant message.

When an ACP backend provides explicit message or content identity, ACP Chat
SHALL prefer that identity for grouping assistant text. When no reliable
identity is available, ACP Chat SHALL group by the current backend/conversation
scoped active assistant segment.

The coalescing rule SHALL be protocol- and semantics-based. It SHALL NOT branch
on backend id, provider id, agent family, command name, or product-specific
backend strings.

#### Scenario: Tool update side-channel does not split assistant text

- **GIVEN** an ACP Chat conversation receives an assistant text chunk
- **AND** it then receives one or more `tool_call_update` events
- **WHEN** another assistant text chunk arrives for the same active segment
- **THEN** the transcript contains one assistant message with the combined text
- **AND** the tool item remains visible as a separate transcript item.

#### Scenario: New tool call remains a hard assistant boundary

- **GIVEN** an ACP Chat conversation has an active assistant text segment
- **WHEN** a new `tool_call` event arrives
- **THEN** the active assistant text segment is completed
- **AND** later assistant text starts a new assistant message.

#### Scenario: User turn prevents cross-turn assistant coalescing

- **GIVEN** an ACP Chat conversation has a completed assistant message
- **WHEN** a user text chunk or explicit turn boundary arrives
- **THEN** later assistant text SHALL NOT append to the previous assistant
  message.
