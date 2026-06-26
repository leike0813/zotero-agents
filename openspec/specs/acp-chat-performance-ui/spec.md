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

ACP Chat and ACP Skills SHALL expose a global streaming render preference that
defaults to enabled.

When the preference is disabled, ACP text and thought chunks SHALL still be
stored in memory and persisted in the final transcript, but pure text chunk
updates SHALL NOT trigger chunk-by-chunk conversation window rendering.

The implementation SHALL refresh the visible transcript at local observable
message boundaries, including transition from streaming text to non-text events,
prompt completion, prompt failure, prompt cancellation, or completion/error
marking of the active streaming item.

#### Scenario: ACP Chat chunks while streaming render is disabled
- **WHEN** an ACP Chat prompt emits many `agent_message_chunk` updates
- **THEN** the in-memory assistant message contains the complete concatenated text
- **AND** chunk-level UI snapshot notifications are suppressed
- **AND** prompt completion renders the completed assistant message.

#### Scenario: ACP Skills chunks while streaming render is disabled
- **WHEN** an ACP Skills run receives many text or thought chunks
- **THEN** the selected run transcript stores the complete concatenated content
- **AND** chunk-level panel refreshes are suppressed
- **AND** a non-text update or turn boundary refreshes the visible transcript.

#### Scenario: streaming render remains enabled by default
- **WHEN** the preference has not been changed
- **THEN** ACP Chat and ACP Skills preserve the existing throttled streaming
  render behavior.

