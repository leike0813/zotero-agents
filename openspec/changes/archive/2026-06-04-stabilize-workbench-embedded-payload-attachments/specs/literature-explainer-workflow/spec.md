## MODIFIED Requirements

### Requirement: literature-explainer workflow MUST 为非幂等 note 写入
`literature-explainer` 仍然为每次成功 apply 创建新的 conversation note，但该 note 的 machine-readable markdown payload MUST use v2 anchored embedded payload storage.

#### Scenario: explainer apply creates v2 payload-backed conversation note
- **WHEN** `literature-explainer` applies a successful interactive bundle result
- **THEN** it SHALL create a conversation note with visible rendered markdown
- **AND** it SHALL store `conversation-note-markdown` in a v2 embedded payload attachment
- **AND** the note HTML SHALL NOT contain a hidden `data-zs-payload="conversation-note-markdown"` block.
