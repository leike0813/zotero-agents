## ADDED Requirements

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

