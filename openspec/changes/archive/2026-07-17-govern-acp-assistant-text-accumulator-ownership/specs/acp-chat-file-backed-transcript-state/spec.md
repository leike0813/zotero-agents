## MODIFIED Requirements

### Requirement: ACP Chat silent transcript is terminal-only

In silent mode, ACP Chat SHALL apply semantic segmentation before transcript mirror mutation. Suppressed assistant chunks, thoughts, tool calls/updates, plans, ordinary statuses, usage, and session metadata SHALL NOT create transcript events, increment transcript metadata, enqueue writer entries, or checkpoint indexes. User content and critical interaction state SHALL remain durable.

ACP Chat SHALL keep the silent terminal assistant candidate as prompt-local, owner-scoped in-memory state separate from shared execution progress. At prompt settlement, ACP Chat SHALL persist at most the final assistant segment collected after entering silent mode and following the most recent hard boundary. A normal result SHALL be complete; an abnormal stop with candidate text SHALL be error-state. If no candidate exists, only critical terminal state SHALL be recorded.

#### Scenario: suppressed stream leaves persistence unchanged

- **GIVEN** an ACP Chat prompt starts in silent mode
- **WHEN** it emits many assistant/thought/tool/metadata updates without terminating
- **THEN** transcript item count, event sequence, writer pending entries, and index state remain unchanged
- **AND** semantic agent-message progress may advance in memory
- **AND** shared execution progress SHALL NOT retain assistant text.

#### Scenario: only last assistant segment is committed

- **GIVEN** silent assistant text is followed by a tool call and later assistant text
- **WHEN** the prompt completes
- **THEN** one complete assistant item containing only the later segment is persisted.

#### Scenario: mode transition does not rewrite history

- **WHEN** an active Chat prompt enters silent mode
- **THEN** its old-mode active row is sealed once and existing history is retained
- **AND** the silent terminal collector starts empty and collects only subsequent eligible assistant text
- **AND** leaving silent discards omitted candidate text without backfill.

#### Scenario: abnormal settlement preserves the current projection contract

- **GIVEN** a silent Chat prompt has collected a non-empty terminal assistant candidate
- **WHEN** the prompt settles abnormally through the existing error path
- **THEN** exactly that candidate is persisted as an error-state assistant item
- **AND** no other suppressed process content is persisted.
