## ADDED Requirements

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
