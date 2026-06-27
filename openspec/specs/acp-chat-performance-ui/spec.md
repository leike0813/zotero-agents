# acp-chat-performance-ui Specification

## Purpose
TBD - created by archiving change optimize-acp-chat-performance-and-ui. Update Purpose after archive.
## Requirements
### Requirement: Streaming Updates Are Throttled

The ACP session manager SHALL avoid persisting the full transcript for every streamed text or thought chunk.

#### Scenario: many streamed chunks

- **WHEN** an ACP prompt produces many `agent_message_chunk` updates
- **THEN** the in-memory assistant message SHALL contain the complete concatenated text
- **AND** UI snapshot notifications SHALL be throttled
- **AND** final prompt completion SHALL persist the complete transcript immediately

### Requirement: Sidebar Snapshot Posting Is Coalesced

The ACP sidebar host SHALL coalesce rapid snapshot notifications before posting to the iframe.

#### Scenario: rapid snapshot notifications

- **WHEN** several snapshots are emitted in the same short window
- **THEN** the iframe SHALL receive only the latest snapshot for that window

### Requirement: Transcript Rendering Is Incremental

The ACP chat page SHALL update transcript DOM nodes by stable `item.id` instead of clearing and rebuilding the entire transcript on every snapshot.

#### Scenario: streaming assistant text

- **WHEN** the same assistant message receives additional streamed text
- **THEN** the existing DOM item SHALL be updated
- **AND** duplicate assistant message nodes SHALL NOT be appended

### Requirement: Diagnostics Rendering Is Lazy

The ACP chat page SHALL not rebuild the diagnostics list while diagnostics are hidden.

#### Scenario: hidden diagnostics during streaming

- **WHEN** diagnostics are hidden and high-frequency diagnostics arrive
- **THEN** the diagnostics list DOM SHALL remain dormant
- **AND** expanding diagnostics SHALL render the latest diagnostics snapshot

### Requirement: Compact Chat Layout

The ACP chat page SHALL expose a compact status summary, collapsible status details, composer footer mode/model controls, and `plain` / `bubble` chat modes.

#### Scenario: default sidebar layout

- **WHEN** the ACP sidebar opens
- **THEN** the status details SHALL default to collapsed
- **AND** the chat display mode SHALL default to `plain`
- **AND** mode/model selectors SHALL be located in the composer footer

#### Scenario: user changes chat display mode

- **WHEN** the user selects `plain` or `bubble`
- **THEN** the page SHALL update its display class
- **AND** the selected mode SHALL be persisted as local UI state

### Requirement: Streaming transcript updates do not reset unrelated panel regions

Conversation streaming updates SHALL be scoped to transcript rows whenever
possible.

#### Scenario: Conversation token stream updates

- **WHEN** a streaming message receives additional content
- **THEN** existing toolbar, banner, drawer, reply, and plan regions SHALL not
  restart animations solely because of the transcript update.

### Requirement: Workspace activity is side-band transcript status

Workspace activity status SHALL not split an active assistant stream.

#### Scenario: Workspace activity arrives during assistant streaming

- **WHEN** an ACP Skills assistant message is streaming
- **AND** a `workspace-activity` status event is recorded
- **THEN** later assistant chunks SHALL continue updating the same streaming
  assistant message.

### Requirement: ACP Streaming Render Can Be Disabled

ACP Chat and ACP Skills SHALL participate in the Assistant Workspace UI publish
policy and SHALL use the global streaming render preference. The preference
defaults to enabled.

When the preference is enabled, ACP text and thought chunks SHALL advance the
UI-visible transcript naturally as backend streaming arrives. Metadata live
updates SHALL remain coalesced to the shared Assistant Workspace live cadence.

When the preference is disabled, ACP text and thought chunks SHALL still be
stored in canonical state and persisted in the final transcript, but live
updates SHALL NOT publish UI snapshots. The visible transcript SHALL update only
at transcript boundaries or critical states.

Metadata, usage, session-info, diagnostics, and other non-transcript updates
SHALL NOT leak unpublished partial text into the visible transcript. Workspace
activity, tool state changes, and plan changes SHALL be structural transcript
events and SHALL publish immediately without releasing unrelated unpublished
streaming text.

#### Scenario: ACP Chat chunks plus metadata while streaming render is disabled

- **WHEN** an ACP Chat prompt emits `agent_message_chunk` updates followed by
  `usage_update` or `session_info_update`
- **THEN** the canonical assistant message contains the accumulated text
- **AND** the visible transcript does not show partial assistant text
- **AND** prompt completion renders the completed assistant message.

#### Scenario: ACP Chat live render streams naturally while enabled

- **WHEN** streaming render is enabled
- **AND** an ACP Chat prompt emits many chunks and metadata updates
- **THEN** visible transcript snapshots advance with the text chunks
- **AND** metadata-only snapshots are still governed by the shared live cadence
- **AND** the final completion publishes the complete transcript immediately.

#### Scenario: ACP Skills chunks plus non-text updates while disabled

- **WHEN** an ACP Skills run receives text or thought chunks followed by usage,
  tool, plan, or workspace activity updates
- **THEN** canonical run transcript stores the complete content
- **AND** usage updates do not expose partial text
- **AND** tool, plan, and workspace activity events appear immediately as
  structural transcript events
- **AND** a transcript boundary or turn completion publishes the complete text.

#### Scenario: ACP tool result status is immediate while disabled

- **GIVEN** streaming render is disabled
- **WHEN** an ACP tool call is visible as pending
- **AND** a later `tool_call_update` marks it completed or failed
- **THEN** the visible tool item updates immediately to the completed or failed
  state.

#### Scenario: ACP critical states remain immediate

- **WHEN** ACP Chat or ACP Skills receives permission, error, waiting, cancel,
  or interrupt state
- **THEN** the panel publishes that state immediately
- **AND** the transcript content in that snapshot uses the latest published
  transcript view unless the event is also a transcript boundary.

