# acp-chat-performance-ui

## ADDED Requirements

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
