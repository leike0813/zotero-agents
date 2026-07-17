## ADDED Requirements

### Requirement: ACP Skills assistant output accumulation has one business owner

ACP Skills SHALL retain assistant text for validation, repair, recovery, and output convergence only in its prompt-lifetime assistant accumulator. Shared ACP execution progress SHALL retain message counts and semantic segment state without retaining assistant text, and transcript persistence SHALL remain independently owned by the transcript store.

#### Scenario: streamed output is not duplicated by execution progress

- **WHEN** an ACP Skills prompt emits assistant text chunks
- **THEN** the prompt-lifetime accumulator SHALL remain the sole in-memory full-turn assistant-text source used by output convergence
- **AND** shared execution progress snapshots SHALL contain no assistant chunk collection or joined assistant body.

#### Scenario: execution mode does not change output convergence

- **WHEN** an ACP Skills prompt runs in live, boundary, or silent display mode
- **THEN** validation, repair, recovery, and output convergence SHALL consume the same prompt-local assistant text as before this ownership change
- **AND** transcript persistence behavior for that display mode SHALL remain unchanged.
