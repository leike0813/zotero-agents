## ADDED Requirements

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
