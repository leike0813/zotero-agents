## ADDED Requirements

### Requirement: ACP Chat persists conversation message-count metadata

ACP Chat SHALL persist complete Assistant, Thought, and Tool current/cumulative count metadata with the conversation owner state. Count metadata SHALL be updated before display-mode suppression and SHALL remain available after prompt settlement and restart without changing transcript JSONL or index schemas.

#### Scenario: cold owner exposes counts before transcript mirror

- **WHEN** a conversation with complete count metadata is selected after restart
- **THEN** its message counter can be populated from conversation metadata
- **AND** transcript page rendering does not wait for full mirror hydration.

#### Scenario: user prompt resets current only

- **WHEN** the user starts another prompt in the same conversation
- **THEN** current Assistant, Thought, and Tool counts reset
- **AND** cumulative conversation counts are retained and continue advancing.

#### Scenario: silent updates do not touch transcript index

- **WHEN** silent Thought or Tool activity advances count metadata
- **THEN** the conversation count summary is updated
- **AND** transcript item count, event sequence, writer entries, and index schema remain unchanged.

