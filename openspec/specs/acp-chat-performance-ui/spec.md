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

ACP Chat and ACP Skills SHALL use the global `live`, `boundary`, or `silent` Assistant execution display mode. `live` SHALL preserve natural text/thought streaming and coalesced metadata publication. `boundary` SHALL preserve the existing disabled-live behavior: canonical transcript remains complete, partial text stays hidden until semantic boundaries, and structural events remain visible.

In every mode, ACP Chat and ACP Skills SHALL count Assistant, Thought, and Tool semantic activity before display-mode projection. Consecutive chunks in one Assistant or Thought segment SHALL increment that category once; a new tool call SHALL increment Tool once; tool updates and soft side-channel updates SHALL neither increment nor split a segment. In `silent`, process content remains suppressed while all three counts continue to advance.

#### Scenario: live mode streams naturally

- **WHEN** mode is `live` and ACP emits many chunks plus metadata
- **THEN** text advances naturally
- **AND** semantic counts advance independently of metadata cadence.

#### Scenario: boundary mode retains complete canonical content

- **WHEN** mode is `boundary` and ACP emits text, thought, tool, and plan updates
- **THEN** canonical transcript retains the complete content
- **AND** visible text waits for its existing semantic boundary.

#### Scenario: silent mode counts hidden process activity

- **WHEN** mode is `silent` and ACP emits Assistant, Thought, and Tool semantic activity
- **THEN** no thought or tool row is displayed
- **AND** the corresponding semantic category counts advance once per segment or tool call.

#### Scenario: silent critical states remain immediate

- **WHEN** silent ACP Chat or ACP Skills receives permission, auth, waiting, error, cancel, interrupt, or terminal state
- **THEN** the panel publishes that state immediately.

### Requirement: Prompt interruption and transcript rendering remain region-scoped

Assistant Workspace SHALL project prompt interruption state independently from transcript revisions and SHALL preserve managed region DOM identity when an unrelated region changes.

#### Scenario: Trailing transcript update arrives while cancellation is requested
- **WHEN** an ACP Chat or ACP Skills prompt is in requested interruption state
- **AND** the backend emits a trailing transcript update
- **THEN** only the transcript region MUST render the transcript change
- **AND** toolbar, banner, plan, hint, reply, context drawer, details drawer, and permission drawer DOM MUST retain identity when their own visible state is unchanged.

#### Scenario: Interruption state changes without transcript content
- **WHEN** the interruption state changes from idle to requested
- **AND** transcript content is unchanged
- **THEN** only regions whose visible interruption controls or status changed MAY rebuild
- **AND** transcript and unrelated managed regions MUST retain DOM identity.

#### Scenario: Requested interruption disables repeated input
- **WHEN** interruption state is `requested`
- **THEN** the reply input and submit action MUST be disabled
- **AND** mode, model, and reasoning controls MUST remain disabled
- **AND** a repeated cancel action MUST NOT be emitted.

### Requirement: ACP Chat routes runtime changes to bounded regions

ACP Chat SHALL classify runtime UI changes as baseline/status, message-counts, transcript, plan, permission, reply/hint, or context/details. Message-count changes SHALL NOT be treated as metadata/status, and transcript append, streaming, loading, page, or revision changes SHALL request only transcript-region work.

Only backend or session scope changes, lifecycle structure, or a user-visible baseline status change SHALL request a baseline publication. ACP Chat SHALL NOT use a generalized reason fallback to build a full panel snapshot.

#### Scenario: Message count changes

- **WHEN** only ACP Chat semantic message counts change
- **THEN** baseline or full snapshot prepare, signature, and post counts SHALL remain zero
- **AND** any visible count update SHALL use its own bounded region publication.

#### Scenario: Transcript advances

- **WHEN** transcript content streams, appends, loads, changes page, or advances revision
- **THEN** ACP Chat SHALL publish only the selected owner's transcript region
- **AND** unrelated managed regions SHALL retain DOM identity.

#### Scenario: Structural status changes

- **WHEN** backend/session scope, lifecycle structure, or user-visible baseline status changes
- **THEN** ACP Chat MAY publish only the affected baseline or status region.

### Requirement: ACP Chat region publication preserves interaction behavior

Region publication SHALL preserve existing live, boundary, and silent projection; tool update coalescing; plan and permission behavior; cancel and resume controls; and owner switching. Side-channel message-count or transcript activity SHALL NOT split assistant text segments or rebuild interaction regions whose visible DTO is unchanged.

#### Scenario: Tool update during streaming

- **WHEN** a tool update or usage side-channel arrives during an assistant text segment
- **THEN** the assistant segment SHALL remain continuous
- **AND** unchanged plan, permission, reply, and drawer regions SHALL not rebuild.

#### Scenario: Permission is requested

- **WHEN** the current owner requests permission
- **THEN** the permission region SHALL publish immediately
- **AND** transcript and unrelated managed regions SHALL retain identity unless their own DTO changes.

### Requirement: Chat steady publication is mutation proportional

ACP Chat SHALL obtain the active owner without frontend snapshot materialization and SHALL publish message counts from the shared count snapshot. Steady transcript publication SHALL use producer-native shared mutations and SHALL perform zero transcript-page, frontend, or panel materialization.

#### Scenario: Boundary assistant message completes

- **WHEN** held assistant text reaches a hard boundary
- **THEN** Chat releases the shared mutation batch without reading the complete page
- **AND** forbidden materialization counts remain zero.

### Requirement: Chat formal publication budget is enforced

For the accepted boundary trace, Chat actual posted bytes per formal round SHALL be below 2.7 MB, steady transcript snapshots SHALL be zero outside explicit lifecycle/rebase causes, and transcript bytes SHALL grow with new mutations rather than accumulated history.

#### Scenario: Formal Chat replay completes

- **WHEN** all formal runs share trace digest, cadence, and user-selected boundary mode
- **THEN** the report passes the byte, materialization, identity, and lifecycle budgets.

