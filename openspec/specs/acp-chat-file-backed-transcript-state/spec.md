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

### Requirement: ACP transcript persistence scheduling is shared and owner-scoped

ACP Chat and ACP Skills SHALL use one bounded persistence scheduling model keyed by stable transcript owner, with at most one physical writer active for each key.

#### Scenario: Drain isolates concurrent owners

- **WHEN** one owner is draining and another owner receives transcript events
- **THEN** each owner SHALL preserve its own event order and durability promise
- **AND** the second owner SHALL NOT block on or join the first owner's physical write.

#### Scenario: Events arriving during drain form the next batch

- **WHEN** new events arrive for a key while its sink is writing a detached batch
- **THEN** the new events SHALL remain pending for the next drain
- **AND** no key SHALL run more than one physical sink concurrently.

#### Scenario: Owner switch remains owner-first

- **WHEN** the selected Chat conversation/backend or ACP Skill run changes
- **THEN** the new owner loading-first or empty snapshot SHALL be published before old-owner release durability work completes
- **AND** old-owner transcript or audit flush SHALL run in the background release flow.

### Requirement: ACP Chat boundaries guarantee target transcript durability

ACP Chat SHALL flush pending transcript, required index, and metadata writes for the target conversation at durable read and lifecycle boundaries without globally draining unrelated conversations.

#### Scenario: Page read flushes only target conversation

- **WHEN** a transcript page is requested for a conversation with pending writes
- **THEN** the page reader SHALL flush that conversation before reading JSONL
- **AND** background conversations SHALL remain independently pending.

#### Scenario: Chat lifecycle boundary is cold-readable

- **WHEN** a user message is handed to the backend or the conversation reaches terminal, disconnect, end, archive, or controlled shutdown
- **THEN** the target transcript and metadata SHALL be durable
- **AND** a later cold indexed page read SHALL reproduce the complete transcript.

### Requirement: Soft ACP Chat metadata is throttled

ACP Chat soft tool and status side-channel updates SHALL use the shared trailing metadata interval while user, interaction, plan, tool-call creation, terminal, and lifecycle boundaries SHALL persist immediately.

#### Scenario: Soft status burst avoids per-event persistence

- **WHEN** many soft tool or status updates arrive for one Chat conversation within the trailing interval
- **THEN** live session state SHALL update immediately
- **AND** metadata persistence SHALL use a bounded number of physical writes.

### Requirement: ACP Chat silent transcript is terminal-only

In silent mode, ACP Chat SHALL apply semantic segmentation before transcript mirror mutation. Suppressed assistant chunks, thoughts, tool calls/updates, plans, ordinary statuses, usage, and session metadata SHALL NOT create transcript events, increment transcript metadata, enqueue writer entries, or checkpoint indexes. User content and critical interaction state SHALL remain durable.

At prompt settlement, ACP Chat SHALL persist at most the final assistant segment following the most recent hard boundary. A normal result SHALL be complete; an abnormal stop with candidate text SHALL be error-state. If no candidate exists, only critical terminal state SHALL be recorded.

#### Scenario: suppressed stream leaves persistence unchanged

- **GIVEN** an ACP Chat prompt starts in silent mode
- **WHEN** it emits many assistant/thought/tool/metadata updates without terminating
- **THEN** transcript item count, event sequence, writer pending entries, and index state remain unchanged
- **AND** semantic agent-message progress may advance in memory.

#### Scenario: only last assistant segment is committed

- **GIVEN** silent assistant text is followed by a tool call and later assistant text
- **WHEN** the prompt completes
- **THEN** one complete assistant item containing only the later segment is persisted.

#### Scenario: mode transition does not rewrite history

- **WHEN** an active Chat prompt enters silent mode
- **THEN** its old-mode active row is sealed once and existing history is retained
- **AND** leaving silent discards omitted candidate text without backfill.

### Requirement: ACP Chat persists conversation message-count metadata

ACP Chat SHALL persist complete Assistant, Thought, and Tool current/cumulative count metadata with the conversation owner state. Count metadata SHALL be updated before display-mode suppression and SHALL remain available after prompt settlement and restart without changing transcript JSONL or index schemas.

An ACP Chat conversation with no transcript history and no persisted count metadata SHALL initialize complete zero-valued metadata. A conversation with prior transcript history but no persisted count metadata SHALL remain unavailable until its next user-originated prompt. That prompt SHALL establish a new observed cumulative epoch with zero baseline before new protocol activity is counted, and the resulting complete metadata SHALL be persisted.

#### Scenario: cold owner exposes counts before transcript mirror

- **WHEN** a conversation with complete count metadata is selected after restart
- **THEN** its message counter can be populated from conversation metadata
- **AND** transcript page rendering does not wait for full mirror hydration.

#### Scenario: empty conversation initializes an x/y counter

- **WHEN** an ACP Chat conversation has no transcript history or count metadata
- **THEN** it restores complete zero-valued Assistant, Thought, and Tool counts
- **AND** its counter can render each category as `0/0`.

#### Scenario: legacy prompt establishes an observed cumulative epoch

- **WHEN** a conversation has prior transcript history but lacks count metadata
- **AND** the user starts its next prompt
- **THEN** current and cumulative counts start from zero before new semantic activity
- **AND** the persisted counter thereafter renders the current execution over the observed cumulative epoch.

#### Scenario: user prompt resets current only

- **WHEN** the user starts another prompt in the same conversation with complete count metadata
- **THEN** current Assistant, Thought, and Tool counts reset
- **AND** cumulative conversation counts are retained and continue advancing.

#### Scenario: silent updates do not touch transcript index

- **WHEN** silent Thought or Tool activity advances count metadata
- **THEN** the conversation count summary is updated
- **AND** transcript item count, event sequence, writer entries, and index schema remain unchanged.

### Requirement: Chat page-first state uses the shared transcript region

ACP Chat owner switches SHALL publish the new owner in shared loading state before indexed page read or full mirror hydrate. A successful indexed page SHALL replace that state with the shared ready region, independently of full mirror readiness.

#### Scenario: Cold conversation is selected

- **WHEN** its cold mirror is absent
- **THEN** Chat publishes loading for the new owner and then a ready indexed page through the same transcript region
- **AND** no Chat-specific transcript lifecycle field is required.

### Requirement: Chat store fields stop at the adapter boundary

Chat store item identifiers, revisions, backend identity, and conversation identity SHALL be converted once by the Chat adapter. Store-specific fields SHALL NOT leak into shared page, item, mutation, receiver, or acknowledgement DTOs.

#### Scenario: Chat page is normalized

- **WHEN** the indexed Chat page enters Workspace publication
- **THEN** owner details exist only in the owner envelope and canonical sequence exists only as eventSeq.

### Requirement: First-open Chat transcript delivery is self-contained

The first foreground ACP Chat owner after plugin startup SHALL render its indexed selected page after owner-first loading without requiring a session switch, tab switch, later transcript event, or full-mirror hydration. Loss or rejection of the first typed page publication SHALL trigger retained replay or current-owner snapshot rebase.

#### Scenario: Workspace opens before Chat child readiness

- **WHEN** the default Chat page is read before the Chat child declares ready
- **THEN** the page publication is retained and rendered after readiness
- **AND** loading resolves to the ready page without user interaction.

#### Scenario: Page publication observes an old owner

- **WHEN** the active owner's page publication is rejected because owner commit has not completed
- **THEN** the shared delivery path replays it after owner commit or publishes a current-page rebase
- **AND** it is not silently discarded.

### Requirement: Chat publication count is display-projected

ACP Chat SHALL maintain raw persisted transcript count inside its domain store and SHALL expose `totalVisibleItemCount` to Workspace only through the selected display projection. Snapshot and delta metadata SHALL use the same projected count.

#### Scenario: Boundary text remains held

- **WHEN** a Chat assistant chunk is persisted but remains hidden until a hard boundary
- **THEN** raw storage may advance while `totalVisibleItemCount` does not
- **AND** a visible tool patch cannot leak the held text or raw count.

### Requirement: Chat cold selection is owner-first

Selecting a Chat backend/conversation SHALL publish the new owner loading state
before indexed page read or full mirror hydration. Indexed page readiness and
full mirror readiness SHALL remain independent.

#### Scenario: The cold full mirror cache misses

- **WHEN** a historical conversation is selected
- **THEN** the indexed page can render the selected page
- **AND** full mirror cache absence does not hide the transcript.
