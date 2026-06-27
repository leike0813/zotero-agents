## MODIFIED Requirements

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
